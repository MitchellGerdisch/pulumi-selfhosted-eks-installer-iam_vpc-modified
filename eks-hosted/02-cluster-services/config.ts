import * as pulumi from "@pulumi/pulumi";

let pulumiConfig = new pulumi.Config();

// Existing Pulumi stack reference in the format:
// <organization>/<project>/<stack> e.g. "myUser/myProject/dev"
const clusterStackRef = new pulumi.StackReference(pulumiConfig.require("clusterStackRef"));

export const config = {
    // Cluster Infra values via stack references
    nodeSecurityGroupId: clusterStackRef.requireOutput("nodeSecurityGroupId"),
    kubeconfig: clusterStackRef.requireOutput("kubeconfig"),
    clusterName: clusterStackRef.requireOutput("clusterName"),

    // RDS Cluster Instances
    dbReplicas: pulumiConfig.getNumber("dbReplicas") ?? 2,
    dbInstanceType: pulumiConfig.get("dbInstanceType") || "db.r5.large",

    // Externally managed stuff
    vpcId: pulumiConfig.require("vpcId"),
    publicSubnetIds: pulumiConfig.requireObject<string[]>("publicSubnetIds"),
    privateSubnetIds: pulumiConfig.requireObject<string[]>("privateSubnetIds"),

    databaseMonitoringRoleArn : pulumiConfig.require("databaseMonitoringRoleArn"),
    podIdentityRoleArn: pulumiConfig.require("podIdentityRoleArn"),
};
