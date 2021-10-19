
interface Result {
  userId?: string;
  partitionDate?: string;
  order?: {};
}

//This function helps us to process data and output various types of frequencies
function frequencyNumber(
  arr: Array<string | number>,
  size: number,
  withKey: boolean,
  withPlainKey: boolean
) {
  let freqMap = new Map();
  for (let i = 0; i < size; i++) {
    if (freqMap.has(arr[i])) {
      freqMap.set(arr[i], freqMap.get(arr[i]) + 1);
    } else {
      freqMap.set(arr[i], 1);
    }
  }
  // Printing the freqMap
  let freqResult = [];
  for (let [key, value] of freqMap.entries()) {
    if (withKey) {
      let freqObj: any = {};
      freqObj[`${key}x`] = value;
      freqResult.push(freqObj);
    } else if (withPlainKey) {
      let freqObj: any = {};
      freqObj["item"] = key;
      freqObj["figure"] = value;
      freqResult.push(freqObj);
    } else {
      freqResult.push(value);
    }
  }
  let sortFavProd = withPlainKey ? sortArrDesc(freqResult) : freqResult;

  return sortFavProd;
}

//This function receives data from the queried response, pass them through various functions and retrun the desired output
export const prepareFrequency = (
  queryResult: Array<Result[]>,
  dailyFrequency: boolean
) => {
  function removeDuplicate(chars: Array<string>) {
    let uniqueChars = chars.filter((element, index) => {
      return chars.indexOf(element) === index;
    });

    return uniqueChars;
  }

  let processedFrequency = queryResult.map((result, index) => {
    if (result.length > 0) {
      let freqObj: any = {};
      let freq = result.map((eachResult: any) => {
        const action = dailyFrequency
          ? eachResult.userId + eachResult.partitioDate
          : eachResult.userId;
        return action;
      });
      dailyFrequency ? removeDuplicate(freq) : freq;
      let allFreq = frequencyNumber(freq, freq.length, false, false);
      let finalFreq = frequencyNumber(allFreq, allFreq.length, true, false);

      freqObj[`week ${index + 1}`] = finalFreq;

      return freqObj;
    } else {
      let noFreq: any = {};
      noFreq[`week ${index + 1}`] = "No frequency";
      return noFreq;
    }
  });
  return processedFrequency;
};

//This function helps to sort ordered products in a descending order.
function sortArrDesc(data: Array<{ item: string; figure: number }>) {
  data.sort((a, b) => (a.figure > b.figure ? -1 : 1));
  let splitData = data.map((eachData) => {
    let itemObj: any = {};
    itemObj[eachData.item] = eachData.figure;
    return itemObj;
  });

  return splitData;
}

//This function helps to find the average cost per order in a given period of time 
function getPriceAverage(data: Array<number>) {
  const reducer = (previousValue: number, currentValue: number) =>
    previousValue + currentValue;
  let roundedUpPrice = data.reduce(reducer) / data.length;
  let priceObj = { avergeCostPerWeek: roundedUpPrice.toFixed(2) };
  return priceObj;
}

//prepare favourite product
export const prepareAvrgData = (
  queryResult: Array<Result[]>,
  isAverageCost: boolean
) => {
  let processedData = queryResult.map((result, index) => {
    if (result.length > 0) {
      let freq = result.map((eachResult: any) => {
        let orderKeys = Object.keys(JSON.parse(eachResult.order));
        const productId = orderKeys[0];
        const action = isAverageCost
          ? JSON.parse(eachResult.order)[productId].price
          : JSON.parse(eachResult.order)[productId].name;
        return action;
      });
      let finalFreq = !isAverageCost
        ? frequencyNumber(freq, freq.length, false, true)
        : getPriceAverage(freq);

      return finalFreq;
    } else {
      let noFreq: { message: string } = {
        message: "no product have been ordered within the given period",
      };
      return noFreq;
    }
  });
  return processedData;
};
