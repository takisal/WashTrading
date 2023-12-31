import "./App.css";
import { useState, useEffect, useCallback } from "react";

/*
API - Get the minimum exchange amount for the selected currency pair with the

'Minimal Exchange Amount'

method;

UI - Ask a user for the amount to exchange and check if this amount is bigger than the minimum exchange amount;

API - Call the

'Estimated Exchange Amount'

method to get the estimated amount for the exchange (in our example, ETH estimated amount);

UI - Show a user the estimated exchange amount and ask for confirmation;

UI - Ask a user for their wallet address to send the funds after the exchange is completed (their refund address, extra ID, refund extra ID);

API - Call the

'Create Exchange Transaction'

method to create an exchange and get the deposit address (in our example, the generated BTC wallet address is returned from this method);

UI - Ask a user to send the funds that they want to exchange to the generated deposit address (in our example, user has to send BTC coins);

UI - A user sends coins, ChangeNOW performs an exchange and makes a withdrawal to user address (in our example, to their ETH address);

API - With

'Transaction status'

you can get the transaction status and display it to a user for them to obtain all the info on the exchange.

*/

function App() {
  const [minAmount, setMinAmount] = useState("0");
  const [lowTime, setLowTime] = useState(0);
  const [highTime, setHighTime] = useState(0);
  const [amountOfBTCToReceive, setAmountOfBTCToReceive] = useState(0);
  const [amountOfBTCToSend, setAmountOfBTCToSend] = useState(0);
  const [destinationBTCAddress, setDestinationBTCAddress] = useState("");
  const [finalBTCAddress, setFinalBTCAddress] = useState("");
  const [hardcodedGas, setHardcodedGas] = useState(0);
  const [stageNumber, setStageNumber] = useState(0);
  const [status, setStatus] = useState("");
  const [swapHash, setSwapHash] = useState("");

  //==================================================================================================
  //Assign values to required variables
  //==================================================================================================
  function getMinAmount() {
    var requestOptions = {
      method: "GET",
      redirect: "follow",
    };

    fetch("http://localhost:3000/getMinAmount", requestOptions)
      .then((response) => response.json())
      .then((result) => {
        setMinAmount((result.minAmount * 2).toString());
        console.log(result);
      })
      .catch((error) => console.log("error", error));
  }
  function estimateReceived(amount) {
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    let raw = JSON.stringify({ amount, path: "btc_xmr" });
    console.log(raw);
    var requestOptions = {
      method: "POST",
      headers: myHeaders,
      redirect: "follow",
      body: raw,
    };
    console.log(requestOptions);
    fetch("http://localhost:3000/estimate", requestOptions)
      .then((response) => response.json())
      .then((result) => {
        let lowEndTime = "";
        let highEndTime = "";
        let preDash = true;
        for (let i = 0; i < result.transactionSpeedForecast.length; i++) {
          if (result.transactionSpeedForecast[i] === "-") {
            preDash = false;
          } else {
            if (preDash) {
              lowEndTime += result.transactionSpeedForecast[i];
            } else {
              highEndTime += result.transactionSpeedForecast[i];
            }
          }
        }
        lowEndTime = parseInt(lowEndTime);
        highEndTime = parseInt(highEndTime);
        setLowTime(lowEndTime);
        setHighTime(highEndTime);
        estimateReceivedStep2(result.estimatedAmount - hardcodedGas);
        console.log(
          "Time Low Estimate: ",
          lowEndTime,
          "Time High Estimate: ",
          highEndTime,
          "EstimatedAmount: ",
          result.estimatedAmount
        );
      })
      .catch((error) => console.log("error", error));
  }
  function estimateReceivedStep2(amount) {
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    let raw = JSON.stringify({ amount, path: "xmr_btc" });
    console.log(raw);
    var requestOptions = {
      method: "POST",
      headers: myHeaders,
      redirect: "follow",
      body: raw,
    };
    console.log(requestOptions);
    fetch("http://localhost:3000/estimate", requestOptions)
      .then((response) => response.json())
      .then((result) => {
        let lowEndTime2 = "";
        let highEndTime2 = "";
        let preDash = true;
        for (let i = 0; i < result.transactionSpeedForecast.length; i++) {
          if (result.transactionSpeedForecast[i] === "-") {
            preDash = false;
          } else {
            if (preDash) {
              lowEndTime2 += result.transactionSpeedForecast[i];
            } else {
              highEndTime2 += result.transactionSpeedForecast[i];
            }
          }
        }
        setLowTime(lowTime + parseInt(lowEndTime2));
        setHighTime(highTime + parseInt(highEndTime2));
        setAmountOfBTCToReceive(result.estimatedAmount);
      })
      .catch((error) => console.log("error", error));
  }

  useEffect(() => {
    setHardcodedGas(0.02);
    getMinAmount();
    setSwapHash(createSwapHash());
  }, []);

  //==================================================================================================
  //Initiate process
  //==================================================================================================
  function createSwapHash() {
    let str = +new Date();
    str = BigInt(str) * BigInt(192);
    return str.toString();
  }
  function initiateSwap(amount, address) {
    if (swapHash === undefined || swapHash === "") {
      return;
    }
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    let raw = JSON.stringify({ amount, address, hash: swapHash });
    var requestOptions = {
      method: "POST",
      headers: myHeaders,
      redirect: "follow",
      body: raw,
    };
    fetch("http://localhost:3000/startTX", requestOptions)
      .then((response) => response.json())
      .then((result) => {
        console.log("got response: ", result);
        if (result.payinAddress === undefined) {
          setDestinationBTCAddress("Error beggining process. Error communicating with ChangeNow API");
        } else {
          setDestinationBTCAddress(result.payinAddress);
        }
      })
      .catch((error) => console.log("error", error));
  }

  //==================================================================================================
  //Check updates
  //==================================================================================================
  const viewTXStatus = useCallback(
    (id) => {
      var myHeaders = new Headers();
      myHeaders.append("Content-Type", "application/json");
      let raw = JSON.stringify({ id, hash: swapHash });
      var requestOptions = {
        method: "POST",
        headers: myHeaders,
        redirect: "follow",
        body: raw,
      };
      fetch("http://localhost:3000/txStatus", requestOptions)
        .then((response) => response.json())
        .then((result) => {
          console.log({ result });
          setStageNumber(result.stage);
          setStatus(result.status);
        })
        .catch((error) => console.log("error", error));
    },
    [swapHash]
  );

  useEffect(() => {
    let newInterval = setInterval(() => {
      console.log("running interval", { swapHash });
      if (swapHash !== "" && swapHash !== undefined) {
        viewTXStatus(swapHash);
      }
    }, 10000);
    return () => clearInterval(newInterval);
  }, [swapHash, viewTXStatus]);

  //==================================================================================================
  //Component upkeep
  //==================================================================================================
  function handleInput1Change(e) {
    setAmountOfBTCToSend(e.target.value);
  }
  function handleInput2Change(e) {
    setFinalBTCAddress(e.target.value);
  }

  return (
    <div className="App">
      <button onClick={getMinAmount}>Get Minimum Amount</button>
      <p>Minimum Amount needed to send: {minAmount}</p>
      <input value={amountOfBTCToSend} onChange={handleInput1Change}></input>
      <label for="btc_final">Address to send the untraceable BTC: </label>
      <input id="btc_final" value={finalBTCAddress} onChange={handleInput2Change}></input>
      <button onClick={estimateReceived.bind(this, amountOfBTCToSend)}>Estimate Received Amount</button>
      <p>
        Swap will take between: {lowTime * 2} to {highTime * 2} minutes
      </p>
      <p>You should receive: {amountOfBTCToReceive} untraceable BTC</p>

      <button onClick={initiateSwap.bind(this, amountOfBTCToSend, finalBTCAddress)}>Begin wash</button>
      <p>Send the BTC you would like to wash here: {destinationBTCAddress} </p>

      <h1>Status:</h1>
      <h2>Swap ID: {swapHash}</h2>
      <h3>
        Step: {stageNumber.toString()}
        <br></br>
        Status: {status}
      </h3>
    </div>
  );
}

export default App;
