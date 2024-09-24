import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi"


const config = new pulumi.Config();

//// 02-cluster-services IAM STUFF ////

// rds IAM stuff
// const databaseMonitoringRole = new aws.iam.Role("databaseMonitoringRole", {
//     assumeRolePolicy: {
//         Statement:[
//             {
//                 Action: "sts:AssumeRole",
//                 Effect: "Allow",
//                 Principal: {
//                     Service: "monitoring.rds.amazonaws.com"
//                 },
//                 Sid: "AllowAssumeRole"
//             }
//         ],
//         Version:"2012-10-17"
//     },
//     managedPolicyArns: [
//         "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
//     ],
// });
// export const databaseMonitoringRoleArn = databaseMonitoringRole.arn;

// // external-dns IAM stuff
// //// THIS has to be modified to be able to accept the oidc provider info as per the original code:
// ///     const saAssumeRolePolicy = pulumi.all([clusterOidcProviderUrl, clusterOidcProviderArn, namespace]).apply(([url, arn, namespaceName]) => aws.iam.getPolicyDocument({
// // THIS IS THE POLICY that is referenced in managedPolicyArns in externalDnsRol
// const externalDnsR53Policy = new aws.iam.Policy("externalDnsR53Policy", {
//     description: "Allows k8s external-dns to manage R53 Hosted Zone records.",
//     policy: {
//         Statement: [
//             {
//                 Action: ["route53:ChangeResourceRecordSets"],
//                 Effect: "Allow",
//                 Resource:["arn:aws:route53:::hostedzone/*"]
//             },
//             {
//                 Action: ["route53:ListHostedZones", "route53:ListResourceRecordSets"],
//                 Effect: "Allow",
//                 Resource: ["*"]
//             }
//         ],
//         Version: "2012-10-17"
//     },
// });

// The config values to set can be found as outputs of the 01-cluster-configuration stack
//// MOD 2 ///
// const clusterOidcProviderArn  = config.require("clusterOidcProviderArn") //"arn:aws:iam::052848974346:oidc-provider/oidc.eks.us-east-2.amazonaws.com/id/E68A4D7B697084C90C1B3985E8F656C4"
// const clusterOidcProviderUrl = config.require("clusterOidcProviderUrl")
/// MOD 2 END ///
// const clusterSvcsNamespaceName = config.require("clusterSvcsNamespaceName")
// const externalDnsAssumeRolePolicy = aws.iam.getPolicyDocumentOutput({
//     statements: [{
//         actions: ["sts:AssumeRoleWithWebIdentity"],
//         conditions: [{
//             test: "StringEquals",
//             values: [`system:serviceaccount:${clusterSvcsNamespaceName}:external-dns`],
//             variable: `${clusterOidcProviderUrl.replace("https://", "")}:sub`,
//         }],
//         effect: "Allow",
//         principals: [{
//             identifiers: [clusterOidcProviderArn],
//             type: "Federated",
//         }],
//     }],
// });
// const externalDnsRole = new aws.iam.Role("externalDnsRole", {
//     assumeRolePolicy: externalDnsAssumeRolePolicy.json,
//     managedPolicyArns: [ externalDnsR53Policy.arn ],
// });
// export const externalDnsRoleArn = externalDnsRole.arn;

// fluentd-cloudwatch IAM stuff
// const fluentdAssumeRolePolicy = aws.iam.getPolicyDocumentOutput({
//     statements: [{
//         actions: ["sts:AssumeRoleWithWebIdentity"],
//         conditions: [{
//             test: "StringEquals",
//             values: [`system:serviceaccount:${clusterSvcsNamespaceName}:fluentd-cloudwatch`],
//             variable: `${clusterOidcProviderUrl.replace("https://", "")}:sub`,
//         }],
//         effect: "Allow",
//         principals: [{
//             identifiers: [clusterOidcProviderArn],
//             type: "Federated",
//         }],
//     }],
// });
// const fluentdCloudwatchPolicy = new aws.iam.Policy("fluentdCloudwatchPolicy", {
//     description: "Allows Fluentd to manage CloudWatch Logs",
//     policy: {
//         Statement: [
//             { 
//                 Action: ["logs:*"],
//                 Effect: "Allow",
//                 Resource: [ "arn:aws:logs:*:*:*" ]
//             }
//         ],
//         Version: "2012-10-17"
//     },
// });
// const fluentdRole = new aws.iam.Role("fluentdRole", {
//     assumeRolePolicy: fluentdAssumeRolePolicy.json,
//     // CLEAN managedPolicyArns: ["arn:aws:iam::052848974346:policy/fluentd-cloudwatch-e3971b4"],
//     managedPolicyArns: [ fluentdCloudwatchPolicy.arn ],
// });
// export const fluentdRoleArn = fluentdRole.arn;

/// alb-ing-cntlr IAM stuff
// const kubeSystemNamespaceName = "kube-system";
// const albIngressAssumeRolePolicy = aws.iam.getPolicyDocumentOutput({
//     statements: [{
//         actions: ["sts:AssumeRoleWithWebIdentity"],
//         conditions: [{
//             test: "StringEquals",
//             values: [`system:serviceaccount:${kubeSystemNamespaceName}:alb-ing-cntlr`],
//             variable: `${clusterOidcProviderUrl.replace("https://", "")}:sub`,
//         }],
//         effect: "Allow",
//         principals: [{
//             identifiers: [clusterOidcProviderArn],
//             type: "Federated",
//         }],
//     }],
// });
// const albIngressMgmtPolicy = new aws.iam.Policy("albIngressMgmtPolicy", {
//     description: "Allows ALB ingress controller to manage ingress and certs",
//     policy: {
//         Statement: [
//             {
//                 Action: "iam:CreateServiceLinkedRole",
//                 Condition: {
//                     StringEquals: { "iam:AWSServiceName":"elasticloadbalancing.amazonaws.com" }
//                 },
//                 Effect: "Allow",
//                 Resource: "*"
//             },
//             {
//                 Action: [ 
//                     "ec2:DescribeAccountAttributes",
//                     "ec2:DescribeAddresses",
//                     "ec2:DescribeAvailabilityZones",
//                     "ec2:DescribeInternetGateways",
//                     "ec2:DescribeVpcs",
//                     "ec2:DescribeVpcPeeringConnections",
//                     "ec2:DescribeSubnets",
//                     "ec2:DescribeSecurityGroups",
//                     "ec2:DescribeInstances",
//                     "ec2:DescribeNetworkInterfaces",
//                     "ec2:DescribeTags",
//                     "ec2:GetCoipPoolUsage",
//                     "ec2:DescribeCoipPools",
//                     "elasticloadbalancing:DescribeLoadBalancers",
//                     "elasticloadbalancing:DescribeLoadBalancerAttributes",
//                     "elasticloadbalancing:DescribeListeners",
//                     "elasticloadbalancing:DescribeListenerCertificates",
//                     "elasticloadbalancing:DescribeSSLPolicies",
//                     "elasticloadbalancing:DescribeRules",
//                     "elasticloadbalancing:DescribeTargetGroups",
//                     "elasticloadbalancing:DescribeTargetGroupAttributes",
//                     "elasticloadbalancing:DescribeTargetHealth",
//                     "elasticloadbalancing:DescribeTags",
//                     "elasticloadbalancing:AddTags"
//                 ],
//                 Effect: "Allow",
//                 Resource: "*"
//             },
//             {
//                 Action: [ 
//                     "cognito-idp:DescribeUserPoolClient",
//                     "acm:ListCertificates",
//                     "acm:DescribeCertificate",
//                     "iam:ListServerCertificates",
//                     "iam:GetServerCertificate",
//                     "waf-regional:GetWebACL",
//                     "waf-regional:GetWebACLForResource",
//                     "waf-regional:AssociateWebACL",
//                     "waf-regional:DisassociateWebACL",
//                     "wafv2:GetWebACL",
//                     "wafv2:GetWebACLForResource",
//                     "wafv2:AssociateWebACL",
//                     "wafv2:DisassociateWebACL",
//                     "shield:GetSubscriptionState",
//                     "shield:DescribeProtection",
//                     "shield:CreateProtection",
//                     "shield:DeleteProtection"
//                 ],
//                 Effect: "Allow",
//                 Resource: "*"
//             },
//             {
//                 Action: [
//                     "ec2:AuthorizeSecurityGroupIngress",
//                     "ec2:RevokeSecurityGroupIngress"
//                 ],
//                 Effect: "Allow",
//                 Resource: "*"
//             },
//             {
//                 Action: ["ec2:CreateSecurityGroup"],
//                 Effect: "Allow",
//                 Resource: "*"
//             },
//             {
//                 Action: [ "ec2:CreateTags" ],
//                 Condition :{
//                     Null:{ "aws:RequestTag/elbv2.k8s.aws/cluster":"false" },
//                     StringEquals: { "ec2:CreateAction":"CreateSecurityGroup" }
//                 },
//                 Effect: "Allow",
//                 Resource: "arn:aws:ec2:*:*:security-group/*"
//             },
//             {
//                 Action: [ 
//                     "ec2:CreateTags",
//                     "ec2:DeleteTags"
//                 ],
//                 Condition:
//                 {
//                     Null: { 
//                         "aws:RequestTag/elbv2.k8s.aws/cluster":"true",
//                         "aws:ResourceTag/elbv2.k8s.aws/cluster":"false"
//                     }
//                 },
//                 Effect: "Allow",
//                 Resource: "arn:aws:ec2:*:*:security-group/*"
//             },
//             {
//                 Action: [ 
//                     "ec2:AuthorizeSecurityGroupIngress",
//                     "ec2:RevokeSecurityGroupIngress",
//                     "ec2:DeleteSecurityGroup"
//                 ],
//                 Condition: {
//                     Null: { "aws:ResourceTag/elbv2.k8s.aws/cluster":"false"}
//                 },
//                 Effect: "Allow",
//                 Resource: "*"
//             },
//             {
//                 Action: [ 
//                     "elasticloadbalancing:CreateLoadBalancer",
//                     "elasticloadbalancing:CreateTargetGroup"
//                 ],
//                 Condition: {
//                     Null: { "aws:RequestTag/elbv2.k8s.aws/cluster":"false"}
//                 },
//                 Effect: "Allow",
//                 Resource: "*"
//             },
//             {
//                 Action: [ 
//                     "elasticloadbalancing:CreateListener",
//                     "elasticloadbalancing:DeleteListener",
//                     "elasticloadbalancing:CreateRule",
//                     "elasticloadbalancing:DeleteRule"
//                 ],
//                 Effect: "Allow",
//                 Resource: "*"
//             },
//             {
//                 Action: [ 
//                     "elasticloadbalancing:AddTags",
//                     "elasticloadbalancing:RemoveTags"
//                 ],
//                 Condition: {
//                     Null: {
//                         "aws:RequestTag/elbv2.k8s.aws/cluster":"true",
//                         "aws:ResourceTag/elbv2.k8s.aws/cluster":"false"
//                     }
//                 },
//                 Effect: "Allow",
//                 Resource: [
//                     "arn:aws:elasticloadbalancing:*:*:targetgroup/*/*",
//                     "arn:aws:elasticloadbalancing:*:*:loadbalancer/net/*/*",
//                     "arn:aws:elasticloadbalancing:*:*:loadbalancer/app/*/*"
//                 ]
//             },
//             {
//                 Action: [
//                     "elasticloadbalancing:AddTags",
//                     "elasticloadbalancing:RemoveTags"
//                 ],
//                 Effect: "Allow",
//                 Resource: [
//                     "arn:aws:elasticloadbalancing:*:*:listener/net/*/*/*",
//                     "arn:aws:elasticloadbalancing:*:*:listener/app/*/*/*",
//                     "arn:aws:elasticloadbalancing:*:*:listener-rule/net/*/*/*",
//                     "arn:aws:elasticloadbalancing:*:*:listener-rule/app/*/*/*"
//                 ]
//             },
//             {
//                 Action: [
//                     "elasticloadbalancing:ModifyLoadBalancerAttributes",
//                     "elasticloadbalancing:SetIpAddressType",
//                     "elasticloadbalancing:SetSecurityGroups",
//                     "elasticloadbalancing:SetSubnets",
//                     "elasticloadbalancing:DeleteLoadBalancer",
//                     "elasticloadbalancing:ModifyTargetGroup",
//                     "elasticloadbalancing:ModifyTargetGroupAttributes",
//                     "elasticloadbalancing:DeleteTargetGroup"
//                 ],
//                 Condition: {
//                     Null: {
//                         "aws:ResourceTag/elbv2.k8s.aws/cluster":"false"
//                     }
//                 },
//                 Effect: "Allow",
//                 Resource: "*"
//             },
//             {
//                 Action:[
//                     "elasticloadbalancing:RegisterTargets",
//                     "elasticloadbalancing:DeregisterTargets"
//                 ],
//                 Effect: "Allow",
//                 Resource: "arn:aws:elasticloadbalancing:*:*:targetgroup/*/*"
//             },
//             {
//                 Action: [
//                     "elasticloadbalancing:SetWebAcl",
//                     "elasticloadbalancing:ModifyListener",
//                     "elasticloadbalancing:AddListenerCertificates",
//                     "elasticloadbalancing:RemoveListenerCertificates",
//                     "elasticloadbalancing:ModifyRule"
//                 ],
//                 Effect: "Allow",
//                 Resource: "*"
//             }
//         ],
//         Version : "2012-10-17"
//     },
// });

// const albIngressRole = new aws.iam.Role("albIngressRole", {
//     assumeRolePolicy: albIngressAssumeRolePolicy.json,
//     // CLEAN managedPolicyArns: ["arn:aws:iam::052848974346:policy/alb-ing-cntlr-38f38cf"],
//     managedPolicyArns: [albIngressMgmtPolicy.arn],
// });
// export const albIngressRoleArn = albIngressRole.arn;

/// S3 access role - used in 03-apps stack
// const appsNamespaceName = config.require("appsNamespaceName")
// const s3roleAssumeRolePolicy = aws.iam.getPolicyDocumentOutput({
//     statements: [{
//         actions: ["sts:AssumeRoleWithWebIdentity"],
//         // conditions: [{
//         //     test: "StringEquals",
//         //     values: [`system:serviceaccount:${appsNamespaceName}:pulumi-api`],
//         //     variable: `${clusterOidcProviderUrl.replace("https://", "")}:sub`,
//         // }],
//         effect: "Allow",
//         principals: [{
//             identifiers: [clusterOidcProviderArn],
//             type: "Federated",
//         }],
//     }],
// });

// const s3AccessRole = new aws.iam.Role("s3AccessRole", {
//     assumeRolePolicy: s3roleAssumeRolePolicy.json,
//     managedPolicyArns: ["arn:aws:iam::aws:policy/AmazonS3FullAccess"],
// });
// export const s3AccessRoleArn = s3AccessRole.arn;


// function createIAM(
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

