import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { config } from "./config";

// const projectName = pulumi.getProject();
const projectName = "mitch-self-01"
const tags = { "Project": "pulumi-k8s-aws-cluster", "Owner": "pulumi"};

// --- Networking ---

// Create a new VPC with custom settings.
const name = "pulumi";
const vpc = new awsx.ec2.Vpc(`${name}-vpc`,
    {
        cidrBlock: "172.16.0.0/16",
        numberOfAvailabilityZones: 3,
        subnetSpecs: [
            // Any non-null value is valid.
            { type: "Public", tags: {"kubernetes.io/role/elb": "1", ...tags}},
            { type: "Private", tags: {"kubernetes.io/role/internal-elb": "1", ...tags}},
        ],
        tags: { "Name": `${name}-vpc`, ...tags},
    },
    {
        transformations: [(args) => {
            if (args.type === "aws:ec2/vpc:Vpc" || args.type === "aws:ec2/subnet:Subnet") {
                return {
                    props: args.props,
                    opts: pulumi.mergeOptions(args.opts, { ignoreChanges: ["tags"] })
                }
            }
            return undefined;
        }],
    }
);

export const vpcId = vpc.vpcId;
export const publicSubnetIds = vpc.publicSubnetIds;
export const privateSubnetIds = vpc.privateSubnetIds;

/*
Minimum System Requirements (per replica):
API:     2048m cpu, 1024Mi ram
Console: 1024m cpu, 512Mi ram

Requirements based on actual service usage and guidelines:
https://www.pulumi.com/docs/guides/self-hosted/api/
https://www.pulumi.com/docs/guides/self-hosted/console/

The instance type is defined to:

- Enable user configuration
- Accommodate minimum system reqs for HA and other required system pods.
- Enable the ability to migrate the service during cluster maintenance.
  This is based on the app's use of node labels in its node affinity to
  shift workloads around. e.g.
    ...
    nodeSelectorTerms: [{
        matchExpressions: [{
                key: "beta.kubernetes.io/instance-type",
                operator: "In",
                values: [config.nodeGroupInstanceType],
        }]
    }]

See for more details:
- https://kubernetes.io/docs/concepts/configuration/assign-pod-node/#built-in-node-labels
- https://aws.amazon.com/ec2/instance-types/

t3.xlarge: 4 vCPU, 16Gi ram
*/
  
export interface AlbSecGroupOptions {
    // The VPC in which to create the security group.
    vpcId: pulumi.Input<string>;
    // The security group of the worker node groups in the cluster that the ALBs
    // will be servicing.
    nodeSecurityGroup: aws.ec2.SecurityGroup;
    // The tags to apply to the security group.
    tags: pulumi.Input<{[key: string]: any}>;
    // The cluster name associated with the worker node group.
    clusterName: pulumi.Input<string>;
}

/**
 * Create a security group for the ALBs that can connect and work with the
 * cluster worker nodes.
 *
 * It's best to create a security group for the ALBs to share, if not the
 * ALB controller will default to creating a new one. Auto creation of
 * security groups can hit ENI limits, and is not guaranteed to be deleted by
 * Pulumi on tear downs, as the ALB controller created it out-of-band.
 *
 * See for more details:
 * https://github.com/kubernetes-sigs/aws-alb-ingress-controller/pull/1019
 *
 */
function createAlbSecurityGroup(name: string, args: AlbSecGroupOptions, parent: pulumi.ComponentResource): aws.ec2.SecurityGroup {
    const albSecurityGroup = new aws.ec2.SecurityGroup(`${name}-albSecurityGroup`, {
        vpcId: args.vpcId,
        revokeRulesOnDelete: true,
        tags: pulumi.all([
            args.tags,
            args.clusterName,
        ]).apply(([tags, clusterName]) => (<aws.Tags>{
            "Name": `${name}-albSecurityGroup`,
            [`kubernetes.io/cluster/${clusterName}`]: "owned",
            ...tags,
        })),
    }, { parent });

    const nodeAlbIngressRule = new aws.ec2.SecurityGroupRule(`${name}-nodeAlbIngressRule`, {
        description: "Allow ALBs to communicate with workers",
        type: "ingress",
        fromPort: 0,
        toPort: 65535,
        protocol: "tcp",
        securityGroupId: args.nodeSecurityGroup.id,
        sourceSecurityGroupId: albSecurityGroup.id,
    }, { parent });

    const albInternetEgressRule = new aws.ec2.SecurityGroupRule(`${name}-albInternetEgressRule`, {
        description: "Allow external internet access",
        type: "egress",
        fromPort: 0,
        toPort: 0,
        protocol: "-1",  // all
        cidrBlocks: [ "0.0.0.0/0" ],
        securityGroupId: albSecurityGroup.id,
    }, { parent });

    const albInternetHttpIngressRule = new aws.ec2.SecurityGroupRule(`${name}-albInternetHttpEgressRule`, {
        description: "Allow internet clients to communicate with ALBs over HTTP",
        type: "ingress",
        fromPort: 80,
        toPort: 80,
        protocol: "tcp",  // all
        cidrBlocks: [ "0.0.0.0/0" ],
        securityGroupId: albSecurityGroup.id,
    }, { parent });

    const albInternetHttpsIngressRule = new aws.ec2.SecurityGroupRule(`${name}-albInternetHttpsEgressRule`, {
        description: "Allow internet clients to communicate with ALBs over HTTPS",
        type: "ingress",
        fromPort: 443,
        toPort: 443,
        protocol: "tcp",  // all
        cidrBlocks: [ "0.0.0.0/0" ],
        securityGroupId: albSecurityGroup.id,
    }, { parent });

    return albSecurityGroup;
}

// --- EKS Cluster ---

// const nodegroupIamRoleGotten = aws.iam.getRoleOutput({name: "goo"}).apply(role => {
//     const unkRole = <unknown> role 
//     const compatRole = <aws.iam.Role> unkRole
//     return compatRole
// })

const serviceRole = aws.iam.Role.get("eksServiceRole", config.eksServiceRoleName)
const instanceRole = aws.iam.Role.get("instanceRole", config.eksInstanceRoleName)
const nodegroupIamRole = aws.iam.Role.get("nodegroupIamRole", config.nodegroupIamRoleName)
const pulumiNodegroupIamRole = aws.iam.Role.get("pulumiNodegroupIamRole", config.pulumiNodegroupIamRoleName)

// Create an EKS cluster.
const cluster = new eks.Cluster(`${projectName}`, {
    ////////////////////////////
    /// MOD ///
    // authenticationMode: "API_AND_CONFIG_MAP",
    // accessEntries: {
    //     nodeGroupIamRole: {
    //         principalArn: config.nodegroupIamRoleArn,
    //         type: eks.AccessEntryType.EC2_LINUX
    //     },
    //     pulumiNodeGroupIamRole: {
    //         principalArn: config.pulumiNodegroupIamRoleArn,
    //         type: eks.AccessEntryType.EC2_LINUX
    //     }
    // },
    // instanceRoles: [ nodegroupIamRole, pulumiNodegroupIamRole],
    // We keep these serviceRole and instanceRole properties to prevent the EKS provider from creating its own roles.
    serviceRole: serviceRole,
    instanceRoles: [nodegroupIamRole, pulumiNodegroupIamRole, instanceRole],
    ////////////////////////////
    vpcId: vpcId,
    publicSubnetIds: publicSubnetIds,
    privateSubnetIds: privateSubnetIds,
    providerCredentialOpts: { profileName: process.env.AWS_PROFILE}, 
    nodeAssociatePublicIpAddress: false,
    skipDefaultNodeGroup: true,
    deployDashboard: false,
    version: config.clusterVersion,
    createOidcProvider: true,
    tags: tags,
    enabledClusterLogTypes: ["api", "audit", "authenticator", "controllerManager", "scheduler"],
}, {
    transformations: [(args) => {
        if (args.type === "aws:eks/cluster:Cluster") {
            return {
                props: args.props,
                opts: pulumi.mergeOptions(args.opts, {
                    protect: true,
                })
            }
        }
        return undefined;
    }],
});

// Export the cluster details.
export const kubeconfig = cluster.kubeconfig.apply(JSON.stringify);
export const clusterName = cluster.core.cluster.name;
export const region = aws.config.region;
export const nodeSecurityGroupId = cluster.nodeSecurityGroup.id; // For RDS
export const nodeGroupInstanceType = config.pulumiNodeGroupInstanceType;

// Create the ALB security group.
const albSecurityGroup = createAlbSecurityGroup(name, {
    vpcId: vpcId,
    nodeSecurityGroup: cluster.nodeSecurityGroup,
    tags: tags,
    clusterName: clusterName,
}, cluster);
export const albSecurityGroupId = albSecurityGroup.id;

// Export the cluster OIDC provider URL.
if (!cluster?.core?.oidcProvider) {
    throw new Error("Invalid cluster OIDC provider URL");
}
const clusterOidcProvider = cluster.core.oidcProvider;
export const clusterOidcProviderArn = clusterOidcProvider.arn;
export const clusterOidcProviderUrl = clusterOidcProvider.url;

// Create a standard node group.

const ssmParam = pulumi.output(aws.ssm.getParameter({
    // https://docs.aws.amazon.com/eks/latest/userguide/retrieve-ami-id.html
    name: `/aws/service/eks/optimized-ami/${config.clusterVersion}/amazon-linux-2/recommended`,
}))
const amiId = ssmParam.value.apply(s => JSON.parse(s).image_id)

const ngStandard = new eks.NodeGroup(`${projectName}-ng-standard`, {
    cluster: cluster,
    /// MOD ///
    instanceProfile: new aws.iam.InstanceProfile("ng-standard", {role: config.nodegroupIamRoleName}),
    nodeAssociatePublicIpAddress: false,
    nodeSecurityGroup: cluster.nodeSecurityGroup,
    clusterIngressRule: cluster.eksClusterIngressRule,
    amiId: amiId,
    
    instanceType: <aws.ec2.InstanceType>config.standardNodeGroupInstanceType,
    desiredCapacity: config.standardNodeGroupDesiredCapacity,
    minSize: config.standardNodeGroupMinSize,
    maxSize: config.standardNodeGroupMaxSize,

    /// MOD ///
    /// NOT SURE HOW THIS EVER WORKED SINCE IT'S OUTPUT<T>
    // labels: {"amiId": `${amiId}`},
    cloudFormationTags: clusterName.apply(clusterName => ({
        "k8s.io/cluster-autoscaler/enabled": "true",
        [`k8s.io/cluster-autoscaler/${clusterName}`]: "true",
        ...tags,
    })),
}, {
    providers: { kubernetes: cluster.provider},
});

// Create a standard node group tainted for use only by self-hosted pulumi.
const ngStandardPulumi = new eks.NodeGroup(`${projectName}-ng-standard-pulumi`, {
    cluster: cluster,
    /// MOD ///
    instanceProfile: new aws.iam.InstanceProfile("ng-standard-pulumi", {role: config.pulumiNodegroupIamRoleName}),
    nodeAssociatePublicIpAddress: false,
    nodeSecurityGroup: cluster.nodeSecurityGroup,
    clusterIngressRule: cluster.eksClusterIngressRule,
    amiId: amiId,

    instanceType: <aws.ec2.InstanceType>config.pulumiNodeGroupInstanceType,
    desiredCapacity: config.pulumiNodeGroupDesiredCapacity,
    minSize: config.pulumiNodeGroupMinSize,
    maxSize: config.pulumiNodeGroupMaxSize,

    /// MOD ///
    /// NOT SURE HOW THIS EVER WORKED SINCE IT'S OUTPUT<T>
    labels: {"amiId": `${amiId}`},
    taints: { "self-hosted-pulumi": { value: "true", effect: "NoSchedule"}},
    cloudFormationTags: clusterName.apply(clusterName => ({
        "k8s.io/cluster-autoscaler/enabled": "true",
        [`k8s.io/cluster-autoscaler/${clusterName}`]: "true",
        ...tags,
    })),
}, {
    providers: { kubernetes: cluster.provider},
});

// Create Kubernetes namespaces.
const clusterSvcsNamespace = new k8s.core.v1.Namespace("cluster-svcs", undefined, { provider: cluster.provider, protect: true });
export const clusterSvcsNamespaceName = clusterSvcsNamespace.metadata.name;

const appsNamespace = new k8s.core.v1.Namespace("apps", undefined, { provider: cluster.provider, protect: true });
export const appsNamespaceName = appsNamespace.metadata.name;

// Create a resource quota in the apps namespace.
//
// Given 2 replicas each for HA:
// API:     4096m cpu, 2048Mi ram
// Console: 2048m cpu, 1024Mi ram
//
// 2x the HA requirements to create capacity for rolling updates of replicas:
// API:     8192m cpu, 4096Mi ram
// Console: 4096m cpu, 2048Mi ram
//
// Totals:  12288m cpu, 6144Mi ram
const quotaAppsNamespace = new k8s.core.v1.ResourceQuota("apps", {
    metadata: {namespace: appsNamespaceName},
    spec: {
        hard: {
            cpu: "12288",
            memory: "6144Mi",
            pods: "20",
            resourcequotas: "1",
            services: "5",
        },
    }
},{
    provider: cluster.provider
});
