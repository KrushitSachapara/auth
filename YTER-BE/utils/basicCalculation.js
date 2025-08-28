const basicCalculation = (price, MRPDetails) => {

    const priceArray = Array.isArray(price) ? price : [price]

    if (!MRPDetails) {
        return [{ minimumMRP: 'N/A', maximumMRP: 'N/A', prices: [] }]
    } else {
        return priceArray?.map((v, ind) => {
            const billValue = (v * MRPDetails.billPercentage) / 100;

            const purchaseRuppee = billValue / (1 + 18 / 100).toFixed(2);
            const purchaseGST = Number((billValue - purchaseRuppee).toFixed(2));

            const addProfitInPurchaseRuppee = purchaseRuppee + Number((purchaseRuppee * 10 / 100).toFixed(2));
            const GSTOnSellValue = Number((addProfitInPurchaseRuppee * 18 / 100).toFixed(2));

            const totalGST = Number((GSTOnSellValue - purchaseGST).toFixed(2));

            const puchasePriceExpense = Number((v + totalGST).toFixed(2))

            const addSkim = Number((puchasePriceExpense / (1 - MRPDetails.skimPercentage / 100)).toFixed(2))
            const brokerCommission = Number((addSkim / (1 - MRPDetails.brokerCommission / 100)).toFixed(2))
            const discount = Number((brokerCommission / (1 - MRPDetails.discountPercentage / 100)).toFixed(2))

            const range = generateRoundedArray(MRPDetails.showroomProfit.minimum, MRPDetails.showroomProfit.maximum);

            const prices = range.map((i, index) => {
                return {
                    percentage: i,
                    price: Number((discount / (1 - i / 100)).toFixed(2))
                }
            })

            const minimumMRP = Number((discount / (1 - MRPDetails.showroomProfit.minimum / 100)).toFixed(2))
            const maximumMRP = Number((discount / (1 - MRPDetails.showroomProfit.maximum / 100)).toFixed(2))

            return { minimumMRP, maximumMRP, prices }
        })
    }

}

function generateRoundedArray(min, max) {
    let result = [];
    let start = Math.ceil(min / 5) * 5;
    let end = Math.floor(max / 5) * 5;

    if (min % 5 !== 0) {
        result.push(min);
    }

    for (let i = start; i <= end; i += 5) {
        result.push(i);
    }

    if (max % 5 !== 0) {
        result.push(max);
    }

    return result;
}

module.exports = { basicCalculation }