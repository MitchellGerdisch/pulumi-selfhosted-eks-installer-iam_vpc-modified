import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as aws from "@pulumi/aws";

//// MOD - not used any more ////
// // Create the AWS IAM policy and role.
// export function createIAM(
//     name: string,
//     namespace: pulumi.Input<string>,
//     clusterOidcProviderArn: pulumi.Input<string>,
//     clusterOidcProviderUrl: pulumi.Input<string>): aws.iam.Role
// {
//     // Create the IAM target policy and role for the Service Account.
//     const saAssumeRolePolicy = pulumi.all([clusterOidcProviderUrl, clusterOidcProviderArn, namespace]).apply(([url, arn, namespaceName]) => aws.iam.getPolicyDocument({
//         statements: [{
//             actions: ["sts:AssumeRoleWithWebIdentity"],
//             conditions: [{
//                 test: "StringEquals",
//                 values: [`system:serviceaccount:${namespaceName}:${name}`],
//                 variable: `${url.replace("https://", "")}:sub`,
//             }],
//             effect: "Allow",
//             principals: [{
//                 identifiers: [arn],
//                 type: "Federated",
//             }],
//         }],
//     }));

//     const saRole = new aws.iam.Role(name, {
//         assumeRolePolicy: saAssumeRolePolicy.json,
//     });
    
//     // Based on: https://git.io/JvMAa
//     const r53Policy = new aws.iam.Policy(name, {
//         description: "Allows k8s external-dns to manage R53 Hosted Zone records.",
//         policy: JSON.stringify(
//             {
//                 Version: "2012-10-17",
//                 Statement: [
//                     {
//                         Effect: "Allow",
//                         Action: [
//                             "route53:ChangeResourceRecordSets"
//                         ],
//                         Resource: [
//                             "arn:aws:route53:::hostedzone/*"
//                         ]
//                     },
//                     {
//                         Effect: "Allow",
//                         Action: [
//                             "route53:ListHostedZones",
//                             "route53:ListResourceRecordSets"
//                         ],
//                         Resource: [
//                             "*"
//                         ]
//                     }
//                 ]
//             }
//         )
//     });

//     // Attach the R53 policy to the role for the service account.
//     const saR53Rpa = new aws.iam.RolePolicyAttachment(name, {
//         policyArn: r53Policy.arn,
//         role: saRole,
//     });

//     return saRole;
// }

// Create a ServiceAccount.
export function createServiceAccount(
    name: string,
    provider: k8s.Provider,
    roleArn: pulumi.Input<aws.ARN>,
    namespace: pulumi.Input<string>): k8s.core.v1.ServiceAccount
{
    return new k8s.core.v1.ServiceAccount(name, {
        metadata: {
            namespace: namespace,
            name: name,
            // REMOVING since I don't think it's needed anymore in the pod identity world
            // annotations: {
            //     "eks.amazonaws.com/role-arn": roleArn,
            // },
        },
    }, { provider },
    );
}

// Create a ClusterRole.
export function createClusterRole(
    name: string,
    provider: k8s.Provider): k8s.rbac.v1.ClusterRole {
    return new k8s.rbac.v1.ClusterRole(
        name,
        {
            rules: [
                {
                    apiGroups: [""],
                    resources: ["services"],
                    verbs: ["get", "list", "watch"],
                },
                {
                    apiGroups: [""],
                    resources: ["pods"],
                    verbs: ["get", "list", "watch"],
                },
                {
                    apiGroups: ["networking","networking.k8s.io"],
                    resources: ["ingresses"],
                    verbs: ["get","watch","list"]
                },
                {
                    apiGroups: ["extensions"],
                    resources: ["ingresses"],
                    verbs: ["get", "list", "watch"],
                },
                {
                    apiGroups: [""],
                    resources: ["endpoints"],
                    verbs: ["get","watch","list"]
                },
                {
                    apiGroups: [""],
                    resources: ["nodes"],
                    verbs: ["get", "watch", "list"],
                },
            ],
        },
        { provider },
    );
}

// Create a ClusterRoleBinding from ServiceAccount -> ClusterRole.
export function createClusterRoleBinding(
    name: string,
    provider: k8s.Provider,
    namespace: pulumi.Input<string>,
    serviceAccountName: pulumi.Input<string>,
    clusterRoleName: pulumi.Input<string>): k8s.rbac.v1.ClusterRoleBinding {
    return new k8s.rbac.v1.ClusterRoleBinding(
        name,
        {
            subjects: [
                {
                    kind: "ServiceAccount",
                    name: serviceAccountName,
                    namespace: namespace,
                },
            ],
            roleRef: {
                apiGroup: "rbac.authorization.k8s.io",
                kind: "ClusterRole",
                name: clusterRoleName,
            },
        },
        { provider },
    );
}
