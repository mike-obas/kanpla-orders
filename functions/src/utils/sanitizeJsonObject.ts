import * as dayjs from "dayjs";

//This function helps to sanitize and prepare our data for
//bigQuery load jobs

function sanitizeObject(data: any[]) {
  const partionableJson = data.map((eachItem) => {
    let date = dayjs.unix(eachItem.dateSeconds);
    //DATE column for JSON objects in bigquery only accepts this format: 'YYYY-MM-DD'
    let newDate = date.format("YYYY-MM-DD");
    //partitionDate in the prescribed format is used for partitioning,
    //see the approach section of the documentation
    eachItem.partitionDate = newDate;
    eachItem.order = `${JSON.stringify(eachItem.order)}`;
    eachItem.date = `${JSON.stringify(eachItem.date)}`;
    return eachItem;
  });
  const newlineDelimitedJson = partionableJson
    .map((item) => JSON.stringify(item))
    .join("\n");
  return newlineDelimitedJson;
}

export default sanitizeObject;
