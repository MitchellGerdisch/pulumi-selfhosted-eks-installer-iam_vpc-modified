import * as pulumi from "@pulumi/pulumi";

let pulumiConfig = new pulumi.Config();

// Existing Pulumi stack reference in the format:
// <organization>/<project>/<stack> e.g. "myUser/myProject/dev"
const clusterStackRef = new pulumi.StackReference(pulumiConfig.require("clusterStackRef"));

export const config = {
    // Infra
    vpcId: clusterStackRef.requireOutput("vpcId"),
    privateSubnetIds: clusterStackRef.requireOutput("privateSubnetIds"),
    publicSubnetIds: clusterStackRef.requireOutput("publicSubnetIds"),
    nodeSecurityGroupId: clusterStackRef.requireOutput("nodeSecurityGroupId"),

    // Cluster
    kubeconfig: clusterStackRef.requireOutput("kubeconfig"),
    clusterName: clusterStackRef.requireOutput("clusterName"),
    clusterSvcsNamespaceName: clusterStackRef.requireOutput("clusterSvcsNamespaceName"),
    appsNamespaceName: clusterStackRef.requireOutput("appsNamespaceName"),
    clusterOidcProviderArn: clusterStackRef.requireOutput("clusterOidcProviderArn"),
    clusterOidcProviderUrl: clusterStackRef.requireOutput("clusterOidcProviderUrl"),

    // RDS Cluster Instances
    dbReplicas: pulumiConfig.getNumber("dbReplicas") ?? 2,
    dbInstanceType: pulumiConfig.get("dbInstanceType") || "db.r4.xlarge",

    // DNS Hosted Zone to manage with external-dns and use with ALB, ACM.
    hostedZoneDomainName: pulumiConfig.require("hostedZoneDomainName"),

    // IAM stuff
    // copy/pasta for now
    databaseMonitoringRoleArn : "arn:aws:iam::052848974346:role/databaseInstanceMonitoringRole-83d2b2a",
    externalDnsRoleArn : "arn:aws:iam::052848974346:role/external-dns-332b3d6",
    fluentdRoleArn           : "arn:aws:iam::052848974346:role/fluentd-cloudwatch-1e3e947",
    albIngressRoleArn: "arn:aws:iam::052848974346:role/alb-ing-cntlr-893c4f2",
};
