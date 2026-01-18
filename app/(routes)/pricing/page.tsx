import { PricingTable } from "@clerk/nextjs";
import React from "react";

function Pricing() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <h2 className="font-bold text-2xl sm:text-3xl text-center my-6">
        Pricing
      </h2>
      <PricingTable />
    </div>
  );
}

export default Pricing;
