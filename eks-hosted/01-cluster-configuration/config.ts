import * as pulumi from "@pulumi/pulumi";

const pulumiConfig = new pulumi.Config();

export const config = {
    clusterVersion: pulumiConfig.get("clusterVersion") || "1.30", 

    clusterName: pulumiConfig.require("clusterName"),

    /**
     * EKS Node Group
     */
    standardNodeGroupInstanceType: pulumiConfig.get("standardNodeGroupInstanceType") || "t3.xlarge",
    standardNodeGroupDesiredCapacity: pulumiConfig.getNumber("standardNodeGroupDesiredCapacity") ?? 2,
    standardNodeGroupMinSize: pulumiConfig.getNumber("standardNodeGroupMinSize") ?? 2,
    standardNodeGroupMaxSize: pulumiConfig.getNumber("standardNodeGroupMaxSize") ?? 5,

    pulumiNodeGroupInstanceType: pulumiConfig.get("pulumiNodeGroupInstanceType") || "t3.xlarge",
    pulumiNodeGroupDesiredCapacity: pulumiConfig.getNumber("pulumiNodeGroupDesiredCapacity") ?? 3,
    pulumiNodeGroupMinSize: pulumiConfig.getNumber("pulumiNodeGroupMinSize") ?? 3,
    pulumiNodeGroupMaxSize: pulumiConfig.getNumber("pulumiNodeGroupMaxSize") ?? 5,

    // currently copy/pasted from 01-iam stack outputs
    eksInstanceRoleName        : pulumiConfig.require("eksInstanceRoleName"),
    instanceProfileName        : pulumiConfig.require("instanceProfileName"),
    eksServiceRoleName         : pulumiConfig.require("eksServiceRoleName"),
    // podIdentityRoleArn         : pulumiConfig.require("podIdentityRoleArn"),

    // Needed to allow the K8s provider and humans to access the cluster.
    // This should be the arn of the role that can be used to interact with AWS.
    ssoRoleArn: pulumiConfig.requireSecret("ssoRoleArn"),

    vpcId: pulumiConfig.require("vpcId"),
    publicSubnetIds: pulumiConfig.requireObject<string[]>("publicSubnetIds"),
    privateSubnetIds: pulumiConfig.requireObject<string[]>("privateSubnetIds"),

    projectName: pulumiConfig.require("projectName"),
};
