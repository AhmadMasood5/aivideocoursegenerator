import { PricingTable } from "@clerk/nextjs";
import React from "react";

function Pricing() {
  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 1rem" }}>
      <h2 className="font-bold text-2xl text-center my-6">Pricing</h2>
      <PricingTable/>
    </div>
  );
}

export default Pricing;
