//express type checker
import { Request, Response } from "express";
// Import the Google Cloud client library
const { BigQuery } = require("@google-cloud/bigquery");
const { Storage } = require("@google-cloud/storage");
const bigquery = new BigQuery();
const storage = new Storage();

export const saveData = (req: Request, res: Response) => {
  //schema respresents table column names in bigQuery table,
  //a partitionDate column is included, it will help to prune our partition table,
  //see approach and architecture section of documentattion
  const schemaData = [
    {
      name: "userId",
      type: "STRING",
      mode: "REQUIRED",
    },
    {
      name: "childId",
      type: "STRING",
      mode: "REQUIRED",
    },
    {
      name: "moduleId",
      type: "STRING",
      mode: "REQUIRED",
    },
    {
      name: "schoolId",
      type: "STRING",
      mode: "REQUIRED",
    },
    {
      name: "order",
      type: "STRING",
      mode: "REQUIRED",
    },
    {
      name: "date",
      type: "STRING",
      mode: "REQUIRED",
    },
    {
      name: "updatedAtSeconds",
      type: "NUMERIC",
      mode: "REQUIRED",
    },
    {
      name: "dateSeconds",
      type: "NUMERIC",
      mode: "REQUIRED",
    },
    {
      name: "groupName",
      type: "STRING",
      mode: "NULLABLE",
    },
    {
      name: "paymentMethod",
      type: "STRING",
      mode: "REQUIRED",
    },
    {
      name: "partitionDate",
      type: "DATE",
      mode: "REQUIRED",
    },
    {
      name: "deleted",
      type: "BOOLEAN",
      mode: "NULLABLE",
    },
  ];

  //Temporary Dataset and table.
  const initialDatasetId = "kanpla_orders";
  const initialTableId = "orders";

  //This is the main dataset and table,
  //see the subsequent load jobs doc under approach section.
  //Make sure to have copied the data into the new
  //table before any subsequent load job is invoked
  const mainDatasetId = "main_record";
  const mainTableId = "orderData";

  /**
   * This sample loads the JSON file at
   * https://storage.googleapis.com/kanpla-orders/2021-10-16.json
   * this is the url to the file in cloud storage"
   **/
  const bucketName = "kanpla-orders";
  //filename will be a dynamic value, prior to subsequent load jobs
  const filename = "2021-10-18.json";

  async function loadJSONFromGCS(datasetId: string, tableId: string) {
    const metadata = {
      sourceFormat: "NEWLINE_DELIMITED_JSON",
      schema: {
        fields: schemaData,
      },
      // Set the write disposition to append to existing table data.
      //To overwrite a table, value is 'WRITE_TRUNCATE'
      writeDisposition: "WRITE_APPEND",
    };

    // Load data from a Google Cloud Storage file into the table
    try {
      const [job] = await bigquery
        .dataset(datasetId)
        .table(tableId)
        .load(storage.bucket(bucketName).file(filename), metadata);
      // load() waits for the job to finish
      return res.json({ message: `Job ${job.id} completed.` });
    } catch (error) {
      return res.json({ message: error });
    }
  }

  //This function creates a partitioned table.
  async function createTablePartitioned() {
    const options = {
      schema: schemaData,
      timePartitioning: {
        type: "DAY",
        //expirationMS: '7776000000', //if table expiration will be allowed, this is great for out-of-the box data expiration period. Helps to save cost and discard off old records.
        field: "partitionDate",
      },
    };

    // Creates a new table in the provided dataset
    try {
      await bigquery
        .dataset(initialDatasetId)
        .createTable(initialTableId, options);
      return loadJSONFromGCS(initialDatasetId, initialTableId);
    } catch (error) {
      return res.status(400).json(error);
    }
  }

  bigquery
    .dataset(mainDatasetId)
    .table(mainTableId)
    .exists()
    .then((exists: any) => {
      if (exists[0]) {
        //if the main table exists, this script is sure that data have been copied into it, then it will append subsequent data to it.
        return loadJSONFromGCS(mainDatasetId, mainTableId);
      } else {
        return createTablePartitioned();
      }
    })
    .catch((err: any) => res.json({ message: err }));
};
