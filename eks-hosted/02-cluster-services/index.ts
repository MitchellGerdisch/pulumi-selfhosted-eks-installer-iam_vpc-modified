import * as aws from "@pulumi/aws";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { config } from "./config";
import { RdsDatabase } from "./rds-db";

const projectName = pulumi.getProject();

////////////
// Deploy RDS Aurora DB
const rds = new RdsDatabase("rds-aurora-db", {
    privateSubnetIds: config.privateSubnetIds,
    securityGroupId : config.nodeSecurityGroupId,
    replicas: config.dbReplicas,
    instanceType: config.dbInstanceType,
    databaseMonitoringRoleArn: config.databaseMonitoringRoleArn,
});
const db = rds.db;

// Export the DB connection information.
interface DbConn {
    host: pulumi.Output<string>;
    port: pulumi.Output<string>;
    username: pulumi.Output<string>;
    password: pulumi.Output<string>;
}
export const dbConn: DbConn = {
    host: db.endpoint,
    port: db.port.apply(port => port.toString()),
    username: db.masterUsername,
    password: rds.password, // db.masterPassword can possibly be undefined. Use rds.password instead.
};

// instantiate k8s provider for subsequent resources
const k8sprovider = new k8s.Provider("provider", {kubeconfig: config.kubeconfig, deleteUnreachable: true});

//////////
// ALB Ingress Controller
// The ALB Ingress Controller automatically creates and plumbs ALBs when a K8s ingress is created (see 03-apps for ingresses being created).
const albServiceAccount = new k8s.core.v1.ServiceAccount("albServiceAccount", {
    metadata: {
        name: "aws-load-balancer-controller",
        namespace: "kube-system"
    }
}, {provider: k8sprovider})

const albHelm = new k8s.helm.v3.Release("albhelm", {
    repositoryOpts: {
        repo: "https://aws.github.io/eks-charts"
    },
    chart: "aws-load-balancer-controller",
    namespace: "kube-system",
    values: {
        clusterName: config.clusterName,
        serviceAccount: {
            create: false,
            name: "aws-load-balancer-controller"
        },
        vpcId: config.vpcId,
    }
}, {provider: k8sprovider});

