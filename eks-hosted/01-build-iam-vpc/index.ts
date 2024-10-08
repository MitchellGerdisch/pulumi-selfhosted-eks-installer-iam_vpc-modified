import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";
import { config } from "./config";
import { albControllerPolicyStatement } from "./albControllerPolicy";

/// SERVICE ROLES ///
const eksRole = new aws.iam.Role(`${config.baseName}-eksRole`, {
    assumeRolePolicy: {
        Statement: [
            {   Action:"sts:AssumeRole",
                Effect:"Allow",
                Principal:{
                    Service: "eks.amazonaws.com"
                }
            }
        ],
        Version:"2012-10-17"
    },
    description: "Allows EKS to manage clusters on your behalf.",
    managedPolicyArns: [
        "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
    ],
});
export const eksServiceRoleName = eksRole.name;

const instanceRole = new aws.iam.Role(`${config.baseName}-instanceRole`, {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal(aws.iam.Principals.Ec2Principal),
    managedPolicyArns: [
        "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
        "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
        "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    ],
});
const instanceRoleS3Policy = new aws.iam.RolePolicyAttachment("instanceRoleS3Policy", {
    policyArn: "arn:aws:iam::aws:policy/AmazonS3FullAccess",
    role: instanceRole 
})
export const eksInstanceRoleName = instanceRole.name;

const instanceProfile =  new aws.iam.InstanceProfile("ng-standard", {role: eksInstanceRoleName})
export const instanceProfileName = instanceProfile.name;

// Used for pod identity roles - instead of using IRSA OIDC stuff.
const podIdentityRole = new aws.iam.Role("podIdentityRole", {
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [{
            Principal: {
                Service: "pods.eks.amazonaws.com"
            },
            Effect: "Allow",
            Action: [
                "sts:AssumeRole",
                "sts:TagSession"
            ]
        }]
    })
});

// Allows pods to manage ALBs
const albControllerPolicy = new aws.iam.Policy("albControllerPolicy", {
    policy: albControllerPolicyStatement
});

// Allows ingress controller to manage ALBs
const rpaAlbPolicy = new aws.iam.RolePolicyAttachment("albPolicy", {
    policyArn: albControllerPolicy.arn,
    role: podIdentityRole
})

// Allows pods to manage S3 - needed by Pulumi services
const s3Policy = new aws.iam.RolePolicyAttachment("s3Policy", {
    policyArn: "arn:aws:iam::aws:policy/AmazonS3FullAccess",
    role: podIdentityRole
})
export const podIdentityRoleArn = podIdentityRole.arn;


// used by RDS to publish metrics to CloudWatch
const databaseMonitoringRole = new aws.iam.Role("databaseMonitoringRole", {
    assumeRolePolicy: {
        Statement:[
            {
                Action: "sts:AssumeRole",
                Effect: "Allow",
                Principal: {
                    Service: "monitoring.rds.amazonaws.com"
                },
                Sid: "AllowAssumeRole"
            }
        ],
        Version:"2012-10-17"
    },
    managedPolicyArns: [
        "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
    ],
});
export const databaseMonitoringRoleArn = databaseMonitoringRole.arn;

/// VPC ///
// --- Networking ---

// Create a new VPC with custom settings.
export const clusterName =  config.clusterName
const clusterNameTag = `kubernetes.io/cluster/${clusterName}`
const vpc = new awsx.ec2.Vpc(`${config.baseName}-vpc`,
    {
        cidrBlock: "172.16.0.0/16",
        numberOfAvailabilityZones: 3,
        subnetSpecs: [
            // Any non-null value is valid.
            { type: "Public", tags: {"kubernetes.io/role/elb": "1", [clusterNameTag]:  "shared" }},
            { type: "Private", tags: {"kubernetes.io/role/internal-elb": "1"}},
        ],
            // tags: { [clusterNameTag]:  "shared" }
        tags: { "Name": `${config.baseName}-vpc`},
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



