import {
  aws_cloudfront,
  aws_cloudfront_origins,
  aws_s3,
  aws_s3_deployment,
  CfnOutput,
  RemovalPolicy,
} from "aws-cdk-lib";
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

    new aws_s3_deployment.BucketDeployment(this, "BucketDeployment", {
      sources: [aws_s3_deployment.Source.asset(path)], //read local files from the provided directory
      destinationBucket: hostingBucket, //specifies the S3 bucket where the assets will be uploaded.
      distribution, //tells AWS where our CloudFront distribution
      distributionPaths: ["/*"], //specifies the paths which CloudFront should invalidate once the new resources are pushed to the S3 bucket ( It's set to /* to indicate that all files in the distribution should be invalidated.)
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
