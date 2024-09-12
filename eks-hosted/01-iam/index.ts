import * as aws from "@pulumi/aws";

//// 01-cluster-configuration IAM STUFF ////
const tags = { "Project": "pulumi-k8s-aws-cluster", "Owner": "pulumi"};

// --- Identity ---

// The managed policies EKS requires of nodegroups join a cluster.
const nodegroupManagedPolicyArns: string[] = [
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
];

// Create the standard node group worker role and attach the required policies.
const ngName = "standardNodeGroup";
const pulumiNgName = "pulumiStandardNodeGroup";
const nodegroupIamRole = new aws.iam.Role(`${ngName}-eksClusterWorkerNode`, {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({"Service": "ec2.amazonaws.com"}),
    tags: tags,
})
attachPoliciesToRole(ngName, nodegroupIamRole, nodegroupManagedPolicyArns);
export const nodegroupIamRoleArn = nodegroupIamRole.arn;
export const nodegroupIamRoleName = nodegroupIamRole.name;

// Create the pulumi standard node group worker role and attach the required policies.
const pulumiNodegroupIamRole = new aws.iam.Role(`${pulumiNgName}-eksClusterWorkerNode`, {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({"Service": "ec2.amazonaws.com"}),
    tags: tags,
})
attachPoliciesToRole(pulumiNgName, pulumiNodegroupIamRole, nodegroupManagedPolicyArns);
export const pulumiNodegroupIamRoleArn = pulumiNodegroupIamRole.arn;
export const pulumiNodegroupIamRoleName = pulumiNodegroupIamRole.name;

// Attach policies to a role.
function attachPoliciesToRole(name: string, role: aws.iam.Role, policyArns: string[]) {
    for (const policyArn of policyArns) {
        new aws.iam.RolePolicyAttachment(`${name}-${policyArn.split('/')[1]}`,
            { policyArn: policyArn, role: role },
        );
    }
}

/// SERVICE ROLES ///
const eksRole = new aws.iam.Role("eksRole", {
    assumeRolePolicy: "{\"Statement\":[{\"Action\":\"sts:AssumeRole\",\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"eks.amazonaws.com\"}}],\"Version\":\"2012-10-17\"}",
    description: "Allows EKS to manage clusters on your behalf.",
    managedPolicyArns: ["arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"],
    name: "mitch-self-01-eksRole-role-27df638",
});
export const eksServiceRoleName = eksRole.name;

const instanceRole = new aws.iam.Role("instanceRole", {
    assumeRolePolicy: "{\"Statement\":[{\"Action\":\"sts:AssumeRole\",\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"ec2.amazonaws.com\"}}],\"Version\":\"2012-10-17\"}",
    managedPolicyArns: [
        "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
        "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
        "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    ],
    name: "mitch-self-01-instanceRole-role-a045dc4",
});
export const eksInstanceRoleName = instanceRole.name;

//// END 01-cluster-configuration IAM STUFF ////



