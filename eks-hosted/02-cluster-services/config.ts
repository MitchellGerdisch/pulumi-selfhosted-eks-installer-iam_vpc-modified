import * as pulumi from "@pulumi/pulumi";

let pulumiConfig = new pulumi.Config();

// Existing Pulumi stack reference in the format:
// <organization>/<project>/<stack> e.g. "myUser/myProject/dev"
const clusterStackRef = new pulumi.StackReference(pulumiConfig.require("clusterStackRef"));

export const config = {
    // Infra
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

    // Externally managed stuff
    vpcId: pulumiConfig.require("vpcId"),
    publicSubnetIds: pulumiConfig.requireObject<string[]>("publicSubnetIds"),
    privateSubnetIds: pulumiConfig.requireObject<string[]>("privateSubnetIds"),

    // copy/pasta for now
    databaseMonitoringRoleArn : pulumiConfig.require("databaseMonitoringRoleArn"),
    externalDnsRoleArn : pulumiConfig.require("externalDnsRoleArn"),
    fluentdRoleArn : pulumiConfig.require("fluentdRoleArn"),
    albIngressRoleArn : pulumiConfig.require("albIngressRoleArn"), 
};
