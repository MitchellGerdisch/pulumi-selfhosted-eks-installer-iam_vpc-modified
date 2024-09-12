import * as pulumi from "@pulumi/pulumi";

const pulumiConfig = new pulumi.Config();

export const config = {
    clusterVersion: pulumiConfig.get("clusterVersion") || "1.21", 

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
    eksInstanceRoleArn        : "arn:aws:iam::052848974346:role/mitch-self-01-instanceRole-role-a045dc4",
    eksInstanceRoleName       : "mitch-self-01-instanceRole-role-a045dc4",
    eksServiceRoleArn         : "arn:aws:iam::052848974346:role/mitch-self-01-eksRole-role-27df638",
    eksServiceRoleName        : "mitch-self-01-eksRole-role-27df638",
    nodegroupIamRoleArn       : "arn:aws:iam::052848974346:role/standardNodeGroup-eksClusterWorkerNode-63141c7",
    nodegroupIamRoleName      : "standardNodeGroup-eksClusterWorkerNode-63141c7",
    pulumiNodegroupIamRoleArn : "arn:aws:iam::052848974346:role/pulumiStandardNodeGroup-eksClusterWorkerNode-e7828e8",
    pulumiNodegroupIamRoleName: "pulumiStandardNodeGroup-eksClusterWorkerNode-e7828e8",
};
