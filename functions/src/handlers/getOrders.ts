//for invoking API
import axios from "axios";
import { Request, Response } from "express";
//for application/x-www-form-urlencoded content-Type
import * as qs from "qs";
import * as dayjs from "dayjs";
import sanitizeJsonOject from "../utils/sanitizeJsonObject";
const { Storage } = require("@google-cloud/storage");
const storage = new Storage();
const myBucket = storage.bucket("kanpla-orders");

export const queryOrders = (req: Request, res: Response) => {
  if (req.method !== "POST") {
    return res.status(400).json({ error: "Method not allowed" });
  }

  interface TokenBody {
    grant_type: string;
    audience: string;
    client_id: string;
    client_secret: string;
  }

  //values were removed due to security issues. Though, the repository is private, it is simply safe not to hold so much trust.
  const payLoad: TokenBody = {
    grant_type: "anonymous_values",
    audience: "anonymous_values",
    client_id: "anonymous_values",
    client_secret:
      "anonymous_values",
  };

  //Authentication to the token API
  async function fetchOrders() {
    try {
      let getToken = await axios.post(
        "https://kanpla.eu.auth0.com/oauth/token",
        qs.stringify(payLoad),
        {
          headers: {
            "Content-type": "application/x-www-form-urlencoded",
          },
        }
      );

      let token: any = getToken.data;

      //Queries orders from the provided endpoint
      let getOrders: any = await axios.get(
        "https://testing.kanpla.dk/api/v1/mock/orders",
        {
          headers: {
            Authorization: `Bearer ${token.access_token}`,
          },
        }
      );

      //filename is named according to date of upload
      let fileName = `${dayjs().format("YYYY-MM-DD")}.json`;
      const file = myBucket.file(fileName);
      //bigQuery only accept newline-delimited json. Hence the conversion.
      let newlineDelimitedJson = sanitizeJsonOject(getOrders.data.data);
      //saves the file as a json object
      return file
        .save(newlineDelimitedJson, {
          resumable: newlineDelimitedJson.length < 10485760 ? false : true,
        })
        .then(() => res.json({ message: "upload successful" }))
        .catch(() => res.json({ error: "upload failed" }));
    } catch (error) {
      return res.status(400).json(error);
    }
  }

  return fetchOrders();
};
