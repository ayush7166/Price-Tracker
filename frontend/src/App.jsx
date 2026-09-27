import { useState, useEffect } from "react";
import "./App.css";
const VITE_API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [search, setsearch] = useState("");
  const [products, setProducts] = useState([]);
  const [trackedProducts, setTrackedProducts] = useState([]);
  useEffect(() => {

    async function loadTrackedProducts() {

      try {

        const response = await fetch(
          `${VITE_API_URL}/api/tracked-products`
        );

        const data = await response.json();

        console.log(
          "Tracked products from DB:",
          data
        );

        setTrackedProducts(data);

      } catch (error) {

        console.error(
          "Failed to load tracked products:",
          error
        );

      }
    }

    loadTrackedProducts();

  }, []);


  const toggleTracking = async (trackingJobId) => {

    try {

      const response = await fetch(
        `${VITE_API_URL}/api/tracked-products/${trackingJobId}/toggle`,
        {
          method: "PATCH"
        }
      );

      const data = await response.json();

      console.log("Tracking status:", data);

      if (!data.success) {
        return;
      }

      // Update the product status in UI
      setTrackedProducts(prev =>
        prev.map(product =>
          product.tracking_job_id === trackingJobId
            ? {
              ...product,
              tracking_active: data.tracking_active
            }
            : product
        )
      );

    } catch (error) {

      console.error(
        "Toggle tracking error:",
        error
      );

    }
  };




  // async function scheduler(pro_scheduler){
  //   try{
  //     const response=fetch("https://localhost:4000:/api/track/scheduler",{
  //       method:"POST",
  //       headers: {
  //         "Content-Type": "application/json"
  //       },
  //       body:JSON.stringfy({
  //         card_code:pro_scheduler.card_code
  //       })
  //     });
  //     const data= (await response).json();
  //     console.log(data);

  //   }catch{
  //     console.log("erro");
  //   }

  // }

  const stopTracking = async (trackingJobId) => {

    try {

      const response = await fetch(
        `${VITE_API_URL}/api/tracked-products/${trackingJobId}`,
        {
          method: "DELETE"
        }
      );

      const data = await response.json();

      console.log("Stop tracking:", data);

      if (!data.success) {
        return;
      }

      // Remove product from UI
      setTrackedProducts(prev =>
        prev.filter(
          product =>
            product.tracking_job_id !== trackingJobId
        )
      );

    } catch (error) {

      console.error(
        "Stop tracking error:",
        error
      );

    }
  };

  const handleTrack = async (product) => {

    try {

      const response = await fetch(
        `${VITE_API_URL}/api/track`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            card_code: product.card_code
          })
        }
      );

      const data = await response.json();

      console.log("Tracker:", data);

      if (!data.success) {
        return;
      }

      // Load latest data from PostgreSQL
      const historyResponse = await fetch(
        `${VITE_API_URL}/api/tracked-products`
      );

      const historyData = await historyResponse.json();

      console.log(
        "Tracked products from DB:",
        historyData
      );

      setTrackedProducts(historyData);

    } catch (error) {

      console.error(
        "Track error:",
        error
      );

    }
  };



  async function handlesubmit(e) {
    e.preventDefault();

    try {
      const response = await fetch(`${VITE_API_URL}/api`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          search: search,
        }),
      });

      const products = await response.json();

      setProducts(products);

      console.log("server:", products);

    } catch (error) {
      console.log("Error:", error);
    }
  }

  return (
    <>
      {/* navbar */}
      <div className="row navbar">
        <div className="col-1"></div>

        <div className="col-8">
          <h2>Price Tracker</h2>
        </div>

        <div className="col-2">
          <h3>Total Product-</h3>
        </div>

        <div className="col-1"></div>
      </div>

      <div className="container-xxl">

        {/* search */}
        <div className="row">
          <div className="col-1"></div>

          <div className="col-10">
            <nav className="navbar bg-body-tertiary">
              <div className="container-fluid">

                <form
                  className="d-flex"
                  role="search"
                  onSubmit={handlesubmit}
                >
                  <input
                    className="form-control me-2"
                    type="search"
                    placeholder="Search"
                    aria-label="Search"
                    name="search"
                    onChange={(e) => setsearch(e.target.value)}
                  />

                  <button
                    className="btn btn-outline-success"
                    type="submit"
                  >
                    Search
                  </button>
                </form>

              </div>
            </nav>
          </div>

          <div className="col-1"></div>
        </div>


        {/* search result data */}
        <div className="row">
          <div className="col-1"></div>

          <div className="col-10">

            <table className="table table-striped table-bordered">

              <thead>
                <tr>
                  <th>Department</th>
                  <th>Card Code</th>
                  <th>Brand</th>
                  <th>Product</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>

                {products.map((product, index) => (

                  <tr key={index}>

                    <td>{product.dept_label}</td>
                    <td>{product.card_code}</td>
                    <td>{product.brand}</td>
                    <td>{product.title}</td>


                    <td>
                      <button
                        onClick={() => handleTrack(product)}
                      >
                        Track
                      </button>
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

          <div className="col-1"></div>
        </div>


        {/* tracker data */}
        <div className="row">
          <div className="col-1"></div>

          <div className="col-10">

            <h3>Tracked Products</h3>

            {trackedProducts.map((product, index) => (

              <div key={index}>

                <h4>Product: {product.product_name}</h4>
                <h4>Card Code: {product.card_code}</h4>
                <h4>Department : {product.dept_label}</h4>
                <h4>Brand : {product.option}</h4>
                <button
                  onClick={() => stopTracking(product.tracking_job_id)}
                >
                  Deleat Product
                </button>
                <h4>
                  Tracking:{" "}
                  {product.tracking_active
                    ? "In Process"
                    : "Paused"}
                </h4>

                <button
                  onClick={() =>
                    toggleTracking(product.tracking_job_id)
                  }
                >
                  {product.tracking_active
                    ? "Pause Tracking"
                    : "Start Tracking"}
                </button>

                <table className="table table-striped table-bordered">

                  <thead>
                    <tr>
                      <th>Option</th>
                      <th>Price</th>
                      <th>Tracked At</th>
                    </tr>
                  </thead>

                  <tbody>

                    {product.prices.map((item, priceIndex) => (
                      <tr key={priceIndex}>
                        <td>{item.option}</td>
                        <td>{item.price}</td>
                        <td>
                          {item.tracked_at
                            ? new Date(item.tracked_at).toLocaleString("en-IN", {
                              timeZone: "Asia/Kolkata",
                              dateStyle: "medium",
                              timeStyle: "medium"
                            })
                            : "N/A"}
                        </td>
                      </tr>
                    ))}

                  </tbody>

                </table>

              </div>

            ))}

          </div>

          <div className="col-1"></div>
        </div>



      </div>
    </>
  );
}

export default App;

