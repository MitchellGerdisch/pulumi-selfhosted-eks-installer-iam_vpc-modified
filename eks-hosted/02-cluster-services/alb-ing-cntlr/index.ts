import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as aws from "@pulumi/aws";
import * as rbac from "./rbac";

export type AlbIngressControllerOptions = {
    namespace: pulumi.Input<string>;
    provider: k8s.Provider;
    vpcId: pulumi.Input<string>;
    clusterName: pulumi.Input<string>;
    clusterOidcProviderArn: pulumi.Input<string>;
    clusterOidcProviderUrl: pulumi.Input<string>;
    albIngressRoleArn: pulumi.Input<string>;
};

const pulumiComponentNamespace: string = "pulumi:AlbIngressController";

export class AlbIngressController extends pulumi.ComponentResource {
    public readonly iamRole: aws.iam.Role;
    public readonly serviceAccount: k8s.core.v1.ServiceAccount;
    public readonly serviceAccountName: pulumi.Output<string>;
    public readonly clusterRole: k8s.rbac.v1.ClusterRole;
    public readonly clusterRoleName: pulumi.Output<string>;
    public readonly clusterRoleBinding: k8s.rbac.v1.ClusterRoleBinding;
    public readonly deployment: k8s.helm.v3.Release;

    constructor(
        name: string,
        args: AlbIngressControllerOptions,
        opts?: pulumi.ComponentResourceOptions,
    ) {
        super(pulumiComponentNamespace, name, args, opts);

        /// IAMSTUFF ///
        
        /// MOD - role created outside of this stack
        // // ServiceAccount
        // this.iamRole = rbac.createIAM(name, args.namespace,
        //     args.clusterOidcProviderArn, args.clusterOidcProviderUrl);

        // K8s resources
        this.serviceAccount = rbac.createServiceAccount(name,
            args.provider, args.albIngressRoleArn, args.namespace);
        this.serviceAccountName = this.serviceAccount.metadata.name;

        // RBAC ClusterRole
        this.clusterRole = rbac.createClusterRole(name, args.provider);
        this.clusterRoleName = this.clusterRole.metadata.name;
        this.clusterRoleBinding = rbac.createClusterRoleBinding(
            name, args.provider, args.namespace, this.serviceAccountName, this.clusterRoleName);

        // Deployment
        const labels = { app: name };
        this.deployment = createDeployment(
            name, args.provider, args.namespace,
            this.serviceAccountName, labels, args.vpcId, args.clusterName);
    }
}

// Create a Deployment using the AWS ALB Ingress Controller Helm Chart
export function createDeployment(
    name: string,
    provider: k8s.Provider,
    namespace: pulumi.Input<string>,
    serviceAccountName: pulumi.Input<string>,
    labels: pulumi.Input<any>,
    vpcId: pulumi.Input<string>,
    clusterName: pulumi.Input<string>)
{
    const awsRegion = pulumi.output(aws.getRegion())
    const chartValues = awsRegion.name.apply(region => {
        return {
            "region": region, //"us-east-2", //pulumi.output(aws.getRegion()),
            "vpcId": vpcId,
            "clusterName": clusterName,
            "serviceAccount": {
                "create": false,
                "name": serviceAccountName
            },
            "podLabels": labels
        }
    })
    return new k8s.helm.v3.Release(name, {
        chart: "aws-load-balancer-controller",
        repositoryOpts: {
            repo: "https://aws.github.io/eks-charts",
        },
        namespace: namespace,
        values: chartValues,
    }, {provider})
}

