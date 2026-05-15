import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as kinesis from 'aws-cdk-lib/aws-kinesis';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';

export class AntharJalaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ========================================
    // DynamoDB Tables
    // ========================================
    
    const borewellTable = new dynamodb.Table(this, 'BorewellRecords', {
      tableName: 'anthar-jala-borewell-records',
      partitionKey: { name: 'geohash', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    borewellTable.addGlobalSecondaryIndex({
      indexName: 'user-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
    });

    const userTable = new dynamodb.Table(this, 'Users', {
      tableName: 'anthar-jala-users',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    userTable.addGlobalSecondaryIndex({
      indexName: 'phone-index',
      partitionKey: { name: 'phoneNumber', type: dynamodb.AttributeType.STRING },
    });

    const alertsTable = new dynamodb.Table(this, 'Alerts', {
      tableName: 'anthar-jala-alerts',
      partitionKey: { name: 'alertId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    alertsTable.addGlobalSecondaryIndex({
      indexName: 'geohash-index',
      partitionKey: { name: 'geohash', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
    });

    const heatmapTable = new dynamodb.Table(this, 'HeatmapCache', {
      tableName: 'anthar-jala-heatmap-cache',
      partitionKey: { name: 'tileId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ========================================
    // Kinesis Stream - DISABLED (requires subscription)
    // ========================================
    
    // const dataStream = new kinesis.Stream(this, 'DataStream', {
    //   streamName: 'anthar-jala-data-stream',
    //   shardCount: 2,
    //   retentionPeriod: cdk.Duration.hours(24),
    // });

    // ========================================
    // SNS Topic
    // ========================================
    
    const alertTopic = new sns.Topic(this, 'AlertTopic', {
      topicName: 'anthar-jala-alerts',
      displayName: 'Anthar-Jala Water Alerts',
    });

    // ========================================
    // Lambda Execution Role
    // ========================================
    
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant permissions
    borewellTable.grantReadWriteData(lambdaRole);
    userTable.grantReadWriteData(lambdaRole);
    alertsTable.grantReadWriteData(lambdaRole);
    heatmapTable.grantReadWriteData(lambdaRole);
    // dataStream.grantReadWrite(lambdaRole); // DISABLED - Kinesis requires subscription
    alertTopic.grantPublish(lambdaRole);

    // ========================================
    // Lambda Functions
    // ========================================
    
    const commonEnv = {
      BOREWELL_TABLE: borewellTable.tableName,
      USER_TABLE: userTable.tableName,
      ALERTS_TABLE: alertsTable.tableName,
      HEATMAP_TABLE: heatmapTable.tableName,
      // KINESIS_STREAM: dataStream.streamName, // DISABLED
      SNS_TOPIC_ARN: alertTopic.topicArn,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || 'AIzaSyBpxnTuJIXxsJ3X4W4PngxUth1AoWyi5S4',
      JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    };

    // Data Ingest Lambda
    const dataIngestLambda = new lambda.Function(this, 'DataIngestFunction', {
      functionName: 'anthar-jala-data-ingest',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../lambda/data-ingest')),
      role: lambdaRole,
      environment: commonEnv,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Heatmap Query Lambda
    const heatmapQueryLambda = new lambda.Function(this, 'HeatmapQueryFunction', {
      functionName: 'anthar-jala-heatmap-query',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../lambda/heatmap-query')),
      role: lambdaRole,
      environment: commonEnv,
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // User History Lambda
    const userHistoryLambda = new lambda.Function(this, 'UserHistoryFunction', {
      functionName: 'anthar-jala-user-history',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../lambda/user-history')),
      role: lambdaRole,
      environment: commonEnv,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Alert Detector Lambda
    const alertDetectorLambda = new lambda.Function(this, 'AlertDetectorFunction', {
      functionName: 'anthar-jala-alert-detector',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../lambda/alert-detector')),
      role: lambdaRole,
      environment: commonEnv,
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Stream Processor Lambda - DISABLED (requires Kinesis)
    // const streamProcessorLambda = new lambda.Function(this, 'StreamProcessorFunction', {
    //   functionName: 'anthar-jala-stream-processor',
    //   runtime: lambda.Runtime.NODEJS_18_X,
    //   handler: 'index.handler',
    //   code: lambda.Code.fromAsset(path.join(__dirname, '../../../lambda/stream-processor')),
    //   role: lambdaRole,
    //   environment: commonEnv,
    //   timeout: cdk.Duration.seconds(60),
    //   memorySize: 512,
    //   logRetention: logs.RetentionDays.ONE_WEEK,
    // });

    // AI Advisor Lambda
    const aiAdvisorLambda = new lambda.Function(this, 'AIAdvisorFunction', {
      functionName: 'anthar-jala-ai-advisor',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../lambda/ai-advisor')),
      role: lambdaRole,
      environment: commonEnv,
      timeout: cdk.Duration.seconds(60),
      memorySize: 1024,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Notification Sender Lambda
    const notificationLambda = new lambda.Function(this, 'NotificationFunction', {
      functionName: 'anthar-jala-notification-sender',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../../lambda/notification-sender')),
      role: lambdaRole,
      environment: commonEnv,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // ========================================
    // API Gateway
    // ========================================
    
    const api = new apigateway.RestApi(this, 'AntharJalaAPI', {
      restApiName: 'Anthar-Jala Watch API',
      description: 'API for Anthar-Jala groundwater monitoring',
      deployOptions: {
        stageName: 'prod',
        throttlingRateLimit: 1000,
        throttlingBurstLimit: 2000,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // API Resources
    const borewellResource = api.root.addResource('borewell');
    const heatmapResource = api.root.addResource('heatmap');
    const historyResource = api.root.addResource('history');
    const alertsResource = api.root.addResource('alerts');
    const aiResource = api.root.addResource('ai');

    // Integrations
    borewellResource.addMethod('POST', new apigateway.LambdaIntegration(dataIngestLambda));
    heatmapResource.addMethod('GET', new apigateway.LambdaIntegration(heatmapQueryLambda));
    historyResource.addMethod('GET', new apigateway.LambdaIntegration(userHistoryLambda));
    alertsResource.addMethod('GET', new apigateway.LambdaIntegration(alertDetectorLambda));
    aiResource.addMethod('POST', new apigateway.LambdaIntegration(aiAdvisorLambda));

    // ========================================
    // Event Source Mappings - DISABLED (requires Kinesis)
    // ========================================
    
    // streamProcessorLambda.addEventSourceMapping('KinesisEventSource', {
    //   eventSourceArn: dataStream.streamArn,
    //   startingPosition: lambda.StartingPosition.LATEST,
    //   batchSize: 100,
    //   maxBatchingWindow: cdk.Duration.seconds(10),
    // });

    alertTopic.addSubscription(
      new cdk.aws_sns_subscriptions.LambdaSubscription(notificationLambda)
    );

    // ========================================
    // Outputs
    // ========================================
    
    new cdk.CfnOutput(this, 'APIEndpoint', {
      value: api.url,
      description: 'API Gateway endpoint URL',
      exportName: 'AntharJalaAPIEndpoint',
    });

    new cdk.CfnOutput(this, 'BorewellTableName', {
      value: borewellTable.tableName,
      description: 'DynamoDB Borewell Records Table',
    });

    // new cdk.CfnOutput(this, 'KinesisStreamName', {
    //   value: dataStream.streamName,
    //   description: 'Kinesis Data Stream',
    // });

    new cdk.CfnOutput(this, 'SNSTopicArn', {
      value: alertTopic.topicArn,
      description: 'SNS Alert Topic ARN',
    });
  }
}
