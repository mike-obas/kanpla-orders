import { Request, Response } from "express";
// Import the Google Cloud client library
const { BigQuery } = require("@google-cloud/bigquery");
// Create a client
const bigqueryClient = new BigQuery();
//dayjs, a lightweight date and time manipulation library
import * as dayjs from "dayjs";
import { prepareFrequency, prepareAvrgData } from "../utils/prepareData";

interface Weeks {
  from: string;
  to: string;
}

//This is a dummy request parameter, october was choosen because it has more orders
//it wil be a dynamic type in production.
//It will be received through a post request
const weeks: Weeks[] = [
  {
    from: "2021-10-01",
    to: "2021-10-07",
  },
  {
    from: "2021-10-08",
    to: "2021-10-14",
  },
  {
    from: "2021-10-15",
    to: "2021-10-21",
  },
  {
    from: "2021-10-22",
    to: "2021-10-28",
  },
  {
    from: "2021-10-29",
    to: "2021-10-31",
  },
];

//This function is being re-used, it returns results based on the provided request.
export const getFrequency = (req: Request, res: Response) => {
  //bigQuery SQL syntax only accept a valid timestamp string,
  //so dayjs is used for appropriate conversion.
  function timestampString(string: string) {
    let dateString = dayjs(string);
    return dateString.format("YYYY-MM-DD");
  }

  function getData(weeks: Weeks) {
    //This is a promise based function that helps us to run a concurrent query.
    return new Promise((resolve, reject) => {
      //This is a ingestion-time partitioned table query.
      //see the approach and architecture section of the documentation
      const isDailyFrequency = req.body.isDailyFrequency
        ? "userId, partitionDate"
        : "userId";
      const sqlQuery = `SELECT
    ${isDailyFrequency}
  FROM
  main_record.orderData
  WHERE
    _PARTITIONTIME BETWEEN TIMESTAMP('${timestampString(weeks.from)}')
    AND TIMESTAMP('${timestampString(weeks.to)}')`;

      const options = {
        query: sqlQuery,
        // Location must match that of the dataset(s) referenced in the query.
        //it is chosen based on nearness to DENMARK. There is support for multi-region as well
        location: "europe-west2",
      };
      interface Result {
        userId?: string;
      }
      //Run the query
      bigqueryClient
        .query(options)
        .then(([result]: Result[]) => {
          resolve(result);
        })
        .catch((err: any) => reject(err));
    });
  }

  //Promise.all is used to allow us wait for our concurrent queries
  //and return response in an array
  let uploadPromises: any[] = [];

  weeks.map((eachQuery: Weeks) => {
    uploadPromises.push(getData(eachQuery));
  });

  Promise.all(uploadPromises)
    .then((result) => {
      return res.json({
        queryResult: prepareFrequency(result, req.body.isDailyFrequency),
      });
    })
    .catch((err) => {
      return res.json(err);
    });
};

//Favourite product over a period of one week (second week of october)
//and
//Average cost per order per week (second week of october)
export const getProductInfo = (req: Request, res: Response) => {
  function timestampString(string: string) {
    let dateString = dayjs(string);
    return dateString.format("YYYY-MM-DD");
  }

  function getData(weeks: Weeks) {
    const isAverageCost = req.body.isAverageCost;
    //The word order is a reserved keyword in BIGQUERY SQL, backticks escapes it.
    const sqlQuery = `SELECT
    \`order\`
      FROM
      main_record.orderData
      WHERE
      _PARTITIONTIME BETWEEN TIMESTAMP('${timestampString(weeks.from)}')
      AND TIMESTAMP('${timestampString(weeks.to)}')`;

    const options = {
      query: sqlQuery,
      location: "europe-west2",
    };
    //Run the query
    bigqueryClient
      .query(options)
      .then((result: any) =>
        res.json({ queryResult: prepareAvrgData(result, isAverageCost) })
      )
      .catch((err: any) => res.json(err));
  }

  getData(weeks[1]);
};

//Kindly note that data is queried from the permanent dataset and table alone,
//The temporary one is expected to be deleted after its contents
//have been copied to the main and permanent own one.
