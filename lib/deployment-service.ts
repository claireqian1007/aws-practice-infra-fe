import {
  aws_cloudfront,
  aws_cloudfront_origins,
  aws_s3,
  aws_s3_deployment,
  CfnOutput,
  RemovalPolicy,
} from "aws-cdk-lib";
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda'
import { Construct } from "constructs";

/*
build a Construct for the different parts of your application that can be reused in infra-stack stack (or even additional stacks).
*/

const path = "./resources/build";

export class DeploymentService extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    const hostingBucket = new aws_s3.Bucket(this, "FrontendBucket", {
      blockPublicAccess: aws_s3.BlockPublicAccess.BLOCK_ALL, // default to be accessible by anyone if not set
      removalPolicy: RemovalPolicy.DESTROY, // remove the bucket when the stack is destroyed
      autoDeleteObjects: true
    });

    const distribution = new aws_cloudfront.Distribution(
      this, //scope
      "CloudfrontDistribution", //id
      {
        defaultBehavior: {
          origin:
            aws_cloudfront_origins.S3BucketOrigin.withOriginAccessControl(
              hostingBucket
            ), //specifies the origin for the distribution
          viewerProtocolPolicy:
            aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS, //forces any incoming HTTP traffic to be redirected to HTTPS, ensuring secure connections for users;
        },
        defaultRootObject: "index.html", //specifies a default file that CloudFront will serve from the defined origin when a user accesses the root URL of your distribution.
        errorResponses: [
          //sets up custom responses to select HTTP error statuses
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
          },
        ],
      }
    );

    
    // 创建自定义角色
    const deploymentRole = new iam.Role(this, 'DeploymentRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    // 添加 S3 权限
    deploymentRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        's3:GetObject*', 's3:GetBucket*', 's3:ListBucket',
        's3:DeleteObject*', 's3:PutObject*', 's3:Abort*'
      ],
      resources: [hostingBucket.bucketArn, hostingBucket.arnForObjects('*')]
    }));

    // 添加 CloudFront 缓存失效权限
    deploymentRole.addToPolicy(new iam.PolicyStatement({
      actions: ['cloudfront:CreateInvalidation', 'cloudfront:GetInvalidation'],
      resources: [distribution.distributionArn] // 限制到特定分配
    }));

    // 添加 Lambda 日志权限
    deploymentRole.addToPolicy(new iam.PolicyStatement({
      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
      resources: ['*']
    }));

    new aws_s3_deployment.BucketDeployment(this, "BucketDeployment", {
      sources: [aws_s3_deployment.Source.asset(path)], //read local files from the provided directory
      destinationBucket: hostingBucket, //specifies the S3 bucket where the assets will be uploaded.
      distribution, //tells AWS where our CloudFront distribution
      distributionPaths: ["/*"], //specifies the paths which CloudFront should invalidate once the new resources are pushed to the S3 bucket ( It's set to /* to indicate that all files in the distribution should be invalidated.)
      role: deploymentRole // 指定自定义角色
    });

    new CfnOutput(this, "CloudFrontURL", {
      value: distribution.domainName,
      description: "The distribution URL",
      exportName: "CloudfrontURL",
    });

    new CfnOutput(this, "BucketName", {
      value: hostingBucket.bucketName,
      description: "The name of the S3 bucket",
      exportName: "BucketName",
    });
  }
}
