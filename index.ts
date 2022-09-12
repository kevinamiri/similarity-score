import {
  APIGatewayProxyEvent,
  APIGatewayProxyResultV2,
  Handler,
} from "aws-lambda";
import fetch from "node-fetch";

export const weaviateObjectify = (content: string, className: string) => {
  return {
    class: className,
    properties: {
      content: content,
    },
  };
};

export const weaviateBatchObject = async (wobjects: any[]) => {
  const url = `https://vector.fzserver.com:8890/v1/batch/objects`;
  try {
    const classes = {
      objects: wobjects,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:103.0) Gecko/20100101 Firefox/103.0",
      },

      body: JSON.stringify(classes),
    });
    const data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    console.log(error);
  }
};

export const removeNewLine = (text) => {
  return text.replace(/\n/g, " ");
};

export const handler: Handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResultV2> => {
  let requestContexts = event.requestContext.authorizer;
  const user = requestContexts.claims.sub;
  const useremail = requestContexts.claims.email;
  let bodyEvent = JSON.parse(event.body);
  const email = useremail;
  const contents = bodyEvent.content;
  const className = bodyEvent.className;

  const listToweaviateObject = Object.values(contents).map((x) =>
    weaviateObjectify(removeNewLine(x), className)
  );
  const vectors: any = await weaviateBatchObject(listToweaviateObject);

  const results = vectors.map((x) => x.result);

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(results),
  };
};
