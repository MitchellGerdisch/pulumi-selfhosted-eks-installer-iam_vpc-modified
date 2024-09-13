import * as pulumi from "@pulumi/pulumi";

const pulumiConfig = new pulumi.Config();

export const config = {
    clusterVersion: pulumiConfig.get("clusterVersion") || "1.24", 

    /**
     * EKS Node Group
     */
    standardNodeGroupInstanceType: pulumiConfig.get("standardNodeGroupInstanceType") || "t3.xlarge",
    standardNodeGroupDesiredCapacity: pulumiConfig.getNumber("standardNodeGroupDesiredCapacity") ?? 2,
    standardNodeGroupMinSize: pulumiConfig.getNumber("standardNodeGroupMinSize") ?? 2,
    standardNodeGroupMaxSize: pulumiConfig.getNumber("standardNodeGroupMaxSize") ?? 5,

    pulumiNodeGroupInstanceType: pulumiConfig.get("standardNodeGroupInstanceType") || "t3.xlarge",
    pulumiNodeGroupDesiredCapacity: pulumiConfig.getNumber("pulumiNodeGroupDesiredCapacity") ?? 3,
    pulumiNodeGroupMinSize: pulumiConfig.getNumber("pulumiNodeGroupMinSize") ?? 3,
    pulumiNodeGroupMaxSize: pulumiConfig.getNumber("pulumiNodeGroupMaxSize") ?? 5,

    // currently copy/pasted from 01-iam stack outputs
    eksInstanceRoleName        : pulumiConfig.require("eksInstanceRoleName"),
    // CLEAN eksInstanceRoleName       : "mitch-self-01-instanceRole-role-a045dc4",
    eksServiceRoleName         : pulumiConfig.require("eksServiceRoleName"),
    // CLEAN eksServiceRoleName        : "mitch-self-01-eksRole-role-27df638",
    // CLEAN nodegroupIamRoleArn       : "arn:aws:iam::052848974346:role/standardNodeGroup-eksClusterWorkerNode-63141c7",
    // CLEAN nodegroupIamRoleName      : "standardNodeGroup-eksClusterWorkerNode-63141c7",
    // CLEAN pulumiNodegroupIamRoleArn : "arn:aws:iam::052848974346:role/pulumiStandardNodeGroup-eksClusterWorkerNode-e7828e8",
    // CLEAN pulumiNodegroupIamRoleName: "pulumiStandardNodeGroup-eksClusterWorkerNode-e7828e8",

    vpcId: pulumiConfig.require("vpcId"),
    publicSubnetIds: pulumiConfig.requireObject<string[]>("publicSubnetIds"),
    privateSubnetIds: pulumiConfig.requireObject<string[]>("privateSubnetIds"),

    projectName: pulumiConfig.require("projectName"),
};
