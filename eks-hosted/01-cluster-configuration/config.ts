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
    nodegroupIamRoleArn: "arn:aws:iam::052848974346:role/standardNodeGroup-eksClusterWorkerNode-d81479e",
    nodegroupIamRoleName: "standardNodeGroup-eksClusterWorkerNode-d81479e",
    pulumiNodegroupIamRoleArn: "arn:aws:iam::052848974346:role/pulumiStandardNodeGroup-eksClusterWorkerNode-154cff3",
    pulumiNodegroupIamRoleName: "pulumiStandardNodeGroup-eksClusterWorkerNode-154cff3",

    eksInstanceRoleName       : "mitch-self-01-instanceRole-role-a045dc4",
    eksServiceRoleName        : "mitch-self-01-eksRole-role-27df638"
};
