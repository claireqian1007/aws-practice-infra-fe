import { Stack, type StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { DeploymentService } from "./deployment-service";
// import * as sqs from 'aws-cdk-lib/aws-sqs';

/*
scope： The parent construct which this construct is a part of. All constructs that define AWS resources are created within the scope of a stack
id： The unique id for this construct within the current scope
props： The optional stack properties. Some common props would include e.g. the AWS region or account you want to deploy your stack to
*/

export class DeployWebAppStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new DeploymentService(this, "deployment");
  }
}
