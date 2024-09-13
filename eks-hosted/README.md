# EKS Self-Hosted Installer - MODIFIED
This is a version of the EKS self-hosted installer found here: https://github.com/pulumi/pulumi-self-hosted-installers/tree/master/eks-hosted  

But, it pulls the IAM and VPC creation into their own stacks. This is done to allow for the use-case where the customer needs to create these types of resources using a different system.

So, for testing, one can use the `build` projects to create these resources and then copy them into the applicable stack config files for the rest of the infrastructure.

## How to Use

* `pulumi login s3://YOURSTATEBUCKET`
* If using the `01-build-iam-vpc` project to create the IAM roles and VPC, subnets, etc: 
  * `cd 01-build-iam-vpc`
  * create a stack and `pulumi up`. You may see errors about missing config. Just follow the instructions.
* `cd 01-cluster-configuration`
  * Look at the `Pulumi.test.yaml` config file to see what and how to set up the configuration for the stack.
  * Additionally, look at `config.ts` to see if there are any other config values you want to set to avoid using the defaults.
  * `pulumi up` 
* If using the `02-03-build-iam` project to create the IAM for the rest of the projects:
  * `cd 02-03-build-iam`
  * create a stack and `pulumi up`. Any config errors, just follow the instructions.

