import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export function genEksKubeconfig(eksCluster: aws.eks.Cluster): pulumi.Output<string> {
  // console.log("Generating kubeconfig")
  // eksCluster.endpoint.apply(endpoint => console.log(`Endpoint: ${endpoint}`))
  // eksCluster.certificateAuthority.apply(auth => console.log(`Certificate Authority: ${auth.data}`)) 
  // eksCluster.name.apply(name => console.log(`Cluster Name: ${name}`)) 
  const kubeconfig = pulumi.all([eksCluster.endpoint, eksCluster.certificateAuthority.apply(auth => auth.data), eksCluster.name]).apply(([endpoint, certauth, name]) => {
      return JSON.stringify({
        "apiVersion": "v1",
        "clusters": [{
          "cluster": {
            "server": endpoint,
            "certificate-authority-data": certauth
          },
          "name": "kubernetes",
        }],
        "contexts": [{
          "context": {
            "cluster": "kubernetes",
            "user": "aws",
          },
          "name": "aws",
        }],
        "current-context": "aws",
        "kind": "Config",
        "users": [{
          "name": "aws",
          "user": {
            "exec": {
              "apiVersion": "client.authentication.k8s.io/v1beta1",
              "command": "aws-iam-authenticator",
              "args": [
                "token",
                "-i",
                name,
              ],
            },
          },
        }]
      })
    })

  // kubeconfig.apply(kubeconfig => console.log("Kubeconfig generated", kubeconfig))
  return kubeconfig
}