import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
// import * as awsx from "@pulumi/awsx";
import * as k8s from "@pulumi/kubernetes";
import { config } from "./config";
import { genEksKubeconfig } from "./utils";

const projectName = config.projectName 

const controlPlaneSg = new aws.ec2.SecurityGroup("controlPlaneSg", {
    vpcId: config.vpcId,
});
export const nodeSecurityGroupId = controlPlaneSg.id;

const eksClusterRole = aws.iam.Role.get("eksServiceRole", config.eksServiceRoleName)
const instanceRole = aws.iam.Role.get("instanceRole", config.eksInstanceRoleName)

const allSubnetIds = pulumi.all([config.publicSubnetIds, config.privateSubnetIds]).apply(([publicSubnetIds, privateSubnets]) => {
    return publicSubnetIds.concat(privateSubnets);
});

const cluster = new aws.eks.Cluster(projectName, {
    name: config.clusterName,
    roleArn: eksClusterRole.arn,
    vpcConfig: {
        subnetIds: pulumi.output(allSubnetIds),
        endpointPublicAccess: true,
        endpointPrivateAccess: true,
        securityGroupIds: [controlPlaneSg.id]
    },
    accessConfig: {
        authenticationMode: "API"
    },
    version: config.clusterVersion,
});
export const clusterName = cluster.name;

const accessEntry = new aws.eks.AccessEntry("accessEntry", {
    clusterName: cluster.name,
    principalArn: config.ssoRoleArn,
});

const roleAccessEntry = new aws.eks.AccessEntry("roleAccessEntry", {
    clusterName: cluster.name,
    principalArn: eksClusterRole.arn
})

const accessEntryPolicyClusterAdmin = new aws.eks.AccessPolicyAssociation("accessEntryPolicyClusterAdmin", {
    accessScope: {
        type: "cluster"
    },
    clusterName: cluster.name,
    principalArn: config.ssoRoleArn,
    policyArn: "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
});

const roleAccessEntryPolicyClusterAdmin = new aws.eks.AccessPolicyAssociation("roleAccessEntryPolicyClusterAdmin", {
    accessScope: {
        type: "cluster"
    },
    clusterName: cluster.name,
    principalArn: eksClusterRole.arn,
    policyArn: "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"
});


const nodeGroupv130 = new aws.eks.NodeGroup("nodeGroup-v130", {
    clusterName: cluster.name,
    nodeRoleArn: instanceRole.arn,
    subnetIds: pulumi.output(config.privateSubnetIds),
    scalingConfig: {
        desiredSize: 3,
        maxSize: 10,
        minSize: 3,
    },
    version: config.clusterVersion,
    labels: {
        version: config.clusterVersion
    },
}); 

const eksPodIdentityAgent = new aws.eks.Addon("eksPodIdentityAddon", {
    addonName: "eks-pod-identity-agent",
    clusterName: cluster.name,
    addonVersion: "v1.3.0-eksbuild.1",
}, {dependsOn: [nodeGroupv130]});

const vpcCniAddon = new aws.eks.Addon("vpcCniAddon", {
    addonName: "vpc-cni",
    clusterName: cluster.name,
    addonVersion: "v1.18.2-eksbuild.1",
}, {dependsOn: [nodeGroupv130]});

const coreDnsAddon = new aws.eks.Addon("coreDns", {
    addonName: "coredns",
    clusterName: cluster.name,
    addonVersion: "v1.10.1-eksbuild.11",
}, {dependsOn: [nodeGroupv130]})

export const kubeconfig = pulumi.secret(genEksKubeconfig(cluster))

const k8sprovider = new k8s.Provider("k8sProvider", {
    kubeconfig: kubeconfig,
}, {dependsOn: cluster});

const clusterSvcsNamespace = new k8s.core.v1.Namespace("cluster-svcs", undefined, { provider: k8sprovider, protect: true });
export const clusterSvcsNamespaceName = clusterSvcsNamespace.metadata.name;

const appsNamespace = new k8s.core.v1.Namespace("apps", undefined, { provider: k8sprovider, protect: true });
export const appsNamespaceName = appsNamespace.metadata.name;

// const namespace = new k8s.core.v1.Namespace("pk", {
//     metadata: {
//         name: "pk"
//     }
// }, {provider: k8sprovider});

// const serviceAccount = new k8s.core.v1.ServiceAccount("podserviceaccount", {
//     metadata: {
//         namespace: namespace.metadata.name,
//     }
// }, {provider: k8sprovider});



// const albServiceAccount = new k8s.core.v1.ServiceAccount("albServiceAccount", {
//     metadata: {
//         name: "aws-load-balancer-controller",
//         namespace: "kube-system"
//     }
// }, {provider: k8sprovider})

// const albPodIdentityAssociation = new aws.eks.PodIdentityAssociation("albPodIdentityAssociation", {
//     clusterName: cluster.name,
//     serviceAccount: albServiceAccount.metadata.name,
//     roleArn: config.podIdentityRoleArn,
//     namespace: "kube-system"
// })

// const podIdentityAssociation = new aws.eks.PodIdentityAssociation("podIdentityAssociation", {
//     clusterName: cluster.name,
//     serviceAccount: serviceAccount.metadata.name,
//     roleArn: config.podIdentityRoleArn,
//     namespace: namespace.metadata.name
// });

// const albHelm = new k8s.helm.v3.Release("albhelm", {
//     repositoryOpts: {
//         repo: "https://aws.github.io/eks-charts"
//     },
//     chart: "aws-load-balancer-controller",
//     namespace: "kube-system",
//     values: {
//         clusterName: cluster.name,
//         serviceAccount: {
//             create: false,
//             name: "aws-load-balancer-controller"
//         },
//         vpcId: config.vpcId,
//     }
// }, {provider: k8sprovider, dependsOn: [albPodIdentityAssociation]});

// const appLabel = { app: "hello-world" };

// const helloWorldDeployment = new k8s.apps.v1.Deployment("hello-world", {
//     metadata: {
//         namespace: namespace.metadata.name
//     },
//     spec: {
//         replicas: 2,
//         selector: {
//             matchLabels: appLabel
//         },
//         template: {
//             metadata: {labels: appLabel},
//             spec: {
//                 serviceAccountName: serviceAccount.metadata.name,
//                 nodeSelector: {
//                     // "karpenterNode": "true"
//                 },
//                 containers: [{
//                     name: "helloworld",
//                     image: "pierskarsenbarg/hello-world-app"
//                 }]
//             },
//         }
//     }
// }, {dependsOn: [podIdentityAssociation]});

// const helloWorldService = new k8s.core.v1.Service("hello-world-service", {
//     metadata: {
//         namespace: namespace.metadata.name
//     },
//     spec: {
//         selector: appLabel,
//         ports: [{
//             port: 8080,
//             targetPort: 8080,
//             name: "http-port"
//         }]
//     }
// }, {dependsOn: [helloWorldDeployment, albHelm]})

// const helloWorldIngress = new k8s.networking.v1.Ingress("hello-world-ingress", {
//     metadata: {
//         namespace: namespace.metadata.name,
//         annotations: {
//             "kubernetes.io/ingress.class": "alb",
//             "alb.ingress.kubernetes.io/target-type": "ip",
//             "alb.ingress.kubernetes.io/scheme": "internet-facing",
//             "alb.ingress.kubernetes.io/tags": "Owner=piers",
//             "alb.ingress.kubernetes.io/listen-ports": '[{"HTTP": 80}]',
//         }
//     },
//     spec: {
//         rules: [{
//             http: {
//                 paths: [{
//                     path: "/",
//                     pathType: "Prefix",
//                     backend: {
//                         service: {
//                             name: helloWorldService.metadata.name,
//                             port: {
//                                 name: helloWorldService.spec.ports[0].name
//                             }
//                         }
//                     }
//                 }]
//             }
//         }]
//     }
// }, {dependsOn: [albHelm]});

// export const helloworldurl = helloWorldIngress.status.loadBalancer.ingress[0].hostname;