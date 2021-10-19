import * as functions from "firebase-functions";
import * as express from "express";
import * as cors from "cors";
//Api endpoint files
import { queryOrders } from "./handlers/getOrders";
import { saveData } from "./handlers/saveData";
import { getFrequency, getProductInfo } from "./handlers/queryRecords";

//express library
const app = express();
app.use(cors());
app.use(
  express.urlencoded({
    extended: true,
  })
);

app.post("/queryOrders", queryOrders);
app.post("/saveData", saveData);
app.post("/getFrequency", getFrequency);
app.post("/getProductInfo", getProductInfo);

//This will export all imported files to cloud function.
export const api = functions
  .runWith({
    // This will ensure the function has enough memory and time
    // to process large files
    timeoutSeconds: 120,
    memory: "512MB",
  })
  .region("europe-west2")
  .https.onRequest(app);

//see the index file section of the documentation

//I have also taken a step further to deploy these functions for easy testing and evaluation
//check the Hands-on Usage section of the documentation to see how to use them.
