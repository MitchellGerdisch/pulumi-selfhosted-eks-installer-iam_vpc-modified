import * as aws from "@pulumi/aws";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import { config } from "./config";
import { RdsDatabase } from "./rds-db";
import { FluentdCloudWatch } from "./fluentd-cloudwatch";
import { ExternalDns } from "./external-dns";
import { AlbIngressController } from "./alb-ing-cntlr";

const projectName = pulumi.getProject();

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

const k8sprovider = new k8s.Provider("provider", {kubeconfig: config.kubeconfig, deleteUnreachable: true});

// ALB Ingress Controller
// The ALB Ingress Controller automatically creates and plumbs ALBs when a K8s ingress is created (see 03-apps for ingresses being created).
const albServiceAccount = new k8s.core.v1.ServiceAccount("albServiceAccount", {
    metadata: {
        name: "aws-load-balancer-controller",
        namespace: "kube-system"
    }
}, {provider: k8sprovider})

const albPodIdentityAssociation = new aws.eks.PodIdentityAssociation("albPodIdentityAssociation", {
    clusterName: config.clusterName,
    serviceAccount: albServiceAccount.metadata.name,
    roleArn: config.podIdentityRoleArn,
    namespace: "kube-system"
})

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
}, {provider: k8sprovider, dependsOn: [albPodIdentityAssociation]});

// // Deploy fluentd-cloudwatch.
// const fluentd = new FluentdCloudWatch("fluentd-cloudwatch", {
//     provider: provider,
//     namespace: config.clusterSvcsNamespaceName,
//     clusterOidcProviderArn: config.clusterOidcProviderArn,
//     clusterOidcProviderUrl: config.clusterOidcProviderUrl,
//     fluentdRoleArn: config.fluentdRoleArn,
// });
// export const fluentdCloudWatchLogGroupName = fluentd.logGroupName;

// Deploy external-dns.
//// SKIPPING FOR NOW TO SEE IF ONE CAN MANUALLY SET IT UP AFTERWARDS
// const extDns = new ExternalDns("external-dns", {
//     provider: k8sprovider,
//     namespace: config.clusterSvcsNamespaceName,
//     clusterName: config.clusterName,
//     commandArgs: [
//         "--source=service",
//         "--source=ingress",
//         "--domain-filter=" + config.hostedZoneDomainName, // will make ExternalDNS see only the hosted zones matching provided domain, omit to process all available hosted zones
//         "--provider=aws",
//         "--policy=sync",
//         "--registry=txt",
//         config.clusterName.apply(name => `--txt-owner-id=${name}`)
//     ],
//     // clusterOidcProviderArn: config.clusterOidcProviderArn,
//     // clusterOidcProviderUrl: config.clusterOidcProviderUrl,
//     // serviceAccountRoleArn: config.externalDnsRoleArn,
//     serviceAccountRoleArn: config.podIdentityRoleArn
// });


// Deploy ALB Ingress Controller.
// const albIngCntlr = new AlbIngressController("alb-ing-cntlr", {
//     namespace: "kube-system",
//     provider: provider,
//     vpcId: config.vpcId, 
//     clusterName: config.clusterName,
//     clusterOidcProviderArn: config.clusterOidcProviderArn,
//     clusterOidcProviderUrl: config.clusterOidcProviderUrl,
//     albIngressRoleArn: config.albIngressRoleArn,
// });
