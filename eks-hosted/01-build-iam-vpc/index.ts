import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const name = config.require("baseName")

/// CLEAN START

// //// 01-cluster-configuration IAM STUFF ////
// const tags = { "Project": "pulumi-k8s-aws-cluster", "Owner": "pulumi"};

// // --- Identity ---

// // The managed policies EKS requires of nodegroups join a cluster.
// const nodegroupManagedPolicyArns: string[] = [
//     "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
//     "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
//     "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
// ];

// // Create the standard node group worker role and attach the required policies.
// const ngName = "standardNodeGroup";
// const nodegroupIamRole = new aws.iam.Role(`${ngName}-eksClusterWorkerNode`, {
//     assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({"Service": "ec2.amazonaws.com"}),
//     tags: tags,
// })
// attachPoliciesToRole(ngName, nodegroupIamRole, nodegroupManagedPolicyArns);
// export const nodegroupIamRoleArn = nodegroupIamRole.arn;

// // Create the pulumi standard node group worker role and attach the required policies.
// const pulumiNgName = "pulumiStandardNodeGroup";
// const pulumiNodegroupIamRole = new aws.iam.Role(`${pulumiNgName}-eksClusterWorkerNode`, {
//     assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({"Service": "ec2.amazonaws.com"}),
//     tags: tags,
// })
// attachPoliciesToRole(pulumiNgName, pulumiNodegroupIamRole, nodegroupManagedPolicyArns);
// export const pulumiNodegroupIamRoleArn = pulumiNodegroupIamRole.arn;

// // Attach policies to a role.
// function attachPoliciesToRole(name: string, role: aws.iam.Role, policyArns: string[]) {
//     for (const policyArn of policyArns) {
//         new aws.iam.RolePolicyAttachment(`${name}-${policyArn.split('/')[1]}`,
//             { policyArn: policyArn, role: role },
//         );
//     }
// }

/// CLEAN END

/// SERVICE ROLES ///
const eksRole = new aws.iam.Role(`${name}-eksRole`, {
    // CLEAN assumeRolePolicy: "{\"Statement\":[{\"Action\":\"sts:AssumeRole\",\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"eks.amazonaws.com\"}}],\"Version\":\"2012-10-17\"}",
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
    // CLEAN name: "mitch-self-01-eksRole-role-27df638",
});
export const eksServiceRoleName = eksRole.name;

const instanceRole = new aws.iam.Role(`${name}-instanceRole`, {
    assumeRolePolicy: {
        Statement:[
            {
                Action: "sts:AssumeRole",
                Effect: "Allow",
                Principal: {
                    Service: "ec2.amazonaws.com"
                }
            }
        ],
        Version: "2012-10-17"
    },
    managedPolicyArns: [
        "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
        "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
        "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    ],
});
export const eksInstanceRoleName = instanceRole.name;


/// VPC ///
// --- Networking ---

// Create a new VPC with custom settings.
const vpc = new awsx.ec2.Vpc(`${name}-vpc`,
    {
        cidrBlock: "172.16.0.0/16",
        numberOfAvailabilityZones: 3,
        subnetSpecs: [
            // Any non-null value is valid.
            { type: "Public", tags: {"kubernetes.io/role/elb": "1"}},
            { type: "Private", tags: {"kubernetes.io/role/internal-elb": "1"}},
        ],
        tags: { "Name": `${name}-vpc`},
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



