import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

//const REGION = process.env.REGION;

export const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: 'us-west-1' }),
  { marshallOptions: { removeUndefinedValues: true } }
);