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
    return data;
  } catch (error) {
    console.log(error);
  }
};

export const weaviateFetch_Projection = async (
  searchQuery: string,
  className: string
) => {
  const url = `https://vector.fzserver.com:8890/v1/graphql`;
  const arr: string = `["${searchQuery}"]`;
  console.log(arr);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `{
          Get {
            ${className} (nearText: {
              concepts: ["${searchQuery}"],
              distance: 0.99,
            }
            limit:100,
            ) {
              content
              _additional { distance, certainty, id, featureProjection(dimensions: 2) {
                      vector
                    } }
            }
          }
        }
        `,
      }),
    });
    const data = await response.json();
    console.log(data);
    return data.data.Get;
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
  const searchQuery = bodyEvent.searchQuery;
  const requestType =
    (bodyEvent.requestType && bodyEvent.requestType) || "index";

  const listToweaviateObject = Object.values(contents).map((x) =>
    weaviateObjectify(removeNewLine(x), className)
  );
  const vectors: any = await weaviateBatchObject(listToweaviateObject);

  const results = vectors.map((x) => x.result);

  const data = await weaviateFetch_Projection("a", className);
  const outputs = data.Questions1.map((x) => ({
    _additional: x._additional,
    content: x.content,
  }));
  const featureProjection = outputs.map((x) => ({
    p: {
      x: x._additional.featureProjection.vector[0],
      y: x._additional.featureProjection.vector[1],
    },
    a: x._additional.featureProjection.vector,
    c: x.content,
  }));

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(featureProjection),
  };
};
