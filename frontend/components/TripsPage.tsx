import React, { useState } from "react";
import { Trip } from "../types";
import { PROJECTS } from "../constants";
import { fetchPerDiemRates } from "../services/gsaService";

interface TripsPageProps {
  trips: Trip[];
  setTrips: React.Dispatch<React.SetStateAction<Trip[]>>;
  onBack: () => void;
  onContinue: () => void;
}

const TripsPage: React.FC<TripsPageProps> = ({
  trips,
  setTrips,
  onBack,
  onContinue,
}) => {
  const [didTravelUS, setDidTravelUS] = useState<boolean | null>(
    trips.length > 0 ? true : null,
  );

  const handleUpdateTrip = (id: string, field: keyof Trip, value: any) => {
    setTrips((prev) =>
      prev.map((trip) => (trip.id === id ? { ...trip, [field]: value } : trip)),
    );
  };

  const handleAddTrip = () => {
    const newTrip: Trip = {
      id: crypto.randomUUID(),
      project: PROJECTS[0],
      purpose: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
      zip: "",
      perDiemRates: null,
      fetchStatus: "idle",
    };
    setTrips((prev) => [...prev, newTrip]);
  };

  const handleRemoveTrip = (id: string) => {
    setTrips((prev) => prev.filter((trip) => trip.id !== id));
  };

  const handleFetchRates = async (trip: Trip) => {
    if (!trip.zip) {
      handleUpdateTrip(trip.id, "errorMessage", "Please enter a Zip Code.");
      return;
    }

    handleUpdateTrip(trip.id, "fetchStatus", "loading");
    handleUpdateTrip(trip.id, "errorMessage", undefined);

    try {
      const rates = await fetchPerDiemRates(trip.startDate, trip.zip);
      handleUpdateTrip(trip.id, "perDiemRates", rates);
      handleUpdateTrip(trip.id, "fetchStatus", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error.";
      handleUpdateTrip(trip.id, "errorMessage", message);
      handleUpdateTrip(trip.id, "fetchStatus", "error");
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 p-8 rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold mb-4 text-slate-700 dark:text-slate-300">
        Step 2: Add Business Trips
      </h2>

      <div className="mb-6">
        <p className="mb-2 text-slate-600 dark:text-slate-400">
          Did you travel within the United States for any of these expenses?
        </p>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setDidTravelUS(true)}
            className={`px-4 py-2 rounded-md font-medium ${
              didTravelUS === true
                ? "bg-indigo-600 text-white"
                : "bg-slate-200 dark:bg-slate-700"
            }`}
          >
            Yes
          </button>
          <button
            onClick={() => {
              setDidTravelUS(false);
              setTrips([]);
            }}
            className={`px-4 py-2 rounded-md font-medium ${
              didTravelUS === false
                ? "bg-indigo-600 text-white"
                : "bg-slate-200 dark:bg-slate-700"
            }`}
          >
            No
          </button>
        </div>
      </div>

      {didTravelUS && (
        <div>
          <p className="mb-6 text-slate-500 dark:text-slate-400">
            Enter your trip details. We will fetch GSA rates based on the Zip
            Code.
          </p>
          <div className="space-y-6">
            {trips.map((trip, index) => (
              <div
                key={trip.id}
                className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 relative"
              >
                <h3 className="font-medium text-lg mb-4 text-indigo-600 dark:text-indigo-400">
                  Trip #{index + 1}
                </h3>
                {trips.length > 1 && (
                  <button
                    onClick={() => handleRemoveTrip(trip.id)}
                    className="absolute top-4 right-4 text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Row 1: Purpose & Project */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Purpose
                    </label>
                    <input
                      type="text"
                      value={trip.purpose}
                      onChange={(e) =>
                        handleUpdateTrip(trip.id, "purpose", e.target.value)
                      }
                      placeholder="e.g., Client On-site"
                      className="w-full p-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Customer/Project
                    </label>
                    <select
                      value={trip.project}
                      onChange={(e) =>
                        handleUpdateTrip(trip.id, "project", e.target.value)
                      }
                      className="w-full p-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600"
                    >
                      {PROJECTS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Row 2: Dates */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={trip.startDate}
                      onChange={(e) =>
                        handleUpdateTrip(trip.id, "startDate", e.target.value)
                      }
                      className="w-full p-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={trip.endDate}
                      onChange={(e) =>
                        handleUpdateTrip(trip.id, "endDate", e.target.value)
                      }
                      className="w-full p-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600"
                    />
                  </div>

                  {/* Row 3: Zip Code (Full Width) */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Destination ZIP Code
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={trip.zip}
                        onChange={(e) =>
                          handleUpdateTrip(trip.id, "zip", e.target.value)
                        }
                        placeholder="e.g. 20001"
                        className="flex-1 p-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600"
                      />
                      <button
                        onClick={() => handleFetchRates(trip)}
                        disabled={trip.fetchStatus === "loading"}
                        className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 whitespace-nowrap"
                      >
                        {trip.fetchStatus === "loading" ? "..." : "Get Rates"}
                      </button>
                    </div>
                    {trip.fetchStatus === "success" && (
                      <p className="text-sm text-green-600 mt-1">
                        ✓ Rates loaded (M&IE: ${trip.perDiemRates?.mie.total})
                      </p>
                    )}
                    {trip.fetchStatus === "error" && (
                      <p className="text-sm text-red-600 mt-1">
                        {trip.errorMessage}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={handleAddTrip}
              className="w-full px-4 py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              + Add Another Trip
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-2 border border-slate-300 dark:border-slate-600 font-medium rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50"
        >
          Back
        </button>
        <button
          onClick={onContinue}
          disabled={didTravelUS === null}
          className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 disabled:bg-indigo-300"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default TripsPage;
