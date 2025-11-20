import { React, useState } from "react";
import { Trip } from "../types";
import { PROJECTS, US_STATES } from "../constants";
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

  const handleUpdateLocation = (
    id: string,
    field: "city" | "state" | "zip",
    value: string,
  ) => {
    setTrips((prev) =>
      prev.map((trip) =>
        trip.id === id
          ? { ...trip, location: { ...trip.location, [field]: value } }
          : trip,
      ),
    );
  };

  const handleAddTrip = () => {
    const newTrip: Trip = {
      id: crypto.randomUUID(),
      project: PROJECTS[0],
      purpose: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
      location: { city: "", state: US_STATES[0].abbr, zip: "" },
      perDiemRates: null,
      fetchStatus: "idle",
    };
    setTrips((prev) => [...prev, newTrip]);
  };

  const handleRemoveTrip = (id: string) => {
    setTrips((prev) => prev.filter((trip) => trip.id !== id));
  };

  const handleFetchRates = async (trip: Trip) => {
    // Reset status
    handleUpdateTrip(trip.id, "fetchStatus", "loading");
    handleUpdateTrip(trip.id, "errorMessage", undefined);

    try {
      // logic moved to gsaService.ts
      const rates = await fetchPerDiemRates(trip.startDate, trip.location);

      handleUpdateTrip(trip.id, "perDiemRates", rates);
      handleUpdateTrip(trip.id, "fetchStatus", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unknown error occurred.";

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
            Add each business trip to fetch its official GSA Per Diem rates.
            These rates will set maximums for lodging and meal expenses on the
            next page.
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
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      placeholder="e.g., Q3 Client On-site"
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
                  <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        City & State
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={trip.location.city}
                          onChange={(e) =>
                            handleUpdateLocation(
                              trip.id,
                              "city",
                              e.target.value,
                            )
                          }
                          placeholder="City"
                          className="w-full p-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600"
                        />
                        <select
                          value={trip.location.state}
                          onChange={(e) =>
                            handleUpdateLocation(
                              trip.id,
                              "state",
                              e.target.value,
                            )
                          }
                          className="p-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600"
                        >
                          {US_STATES.map((s) => (
                            <option key={s.abbr} value={s.abbr}>
                              {s.abbr}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-end">
                      <span className="text-sm text-slate-500 px-2">or</span>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          ZIP Code
                        </label>
                        <input
                          type="text"
                          value={trip.location.zip}
                          onChange={(e) =>
                            handleUpdateLocation(trip.id, "zip", e.target.value)
                          }
                          placeholder="ZIP Code"
                          className="w-full p-2 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => handleFetchRates(trip)}
                    disabled={trip.fetchStatus === "loading"}
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
                  >
                    {trip.fetchStatus === "loading"
                      ? "Fetching..."
                      : "Fetch Per Diem Rates"}
                  </button>
                  {trip.fetchStatus === "success" && (
                    <p className="text-sm text-green-600 mt-2">
                      Per diem rates successfully loaded.
                    </p>
                  )}
                  {trip.fetchStatus === "error" && (
                    <p className="text-sm text-red-600 mt-2">
                      Error: {trip.errorMessage}
                    </p>
                  )}
                </div>
              </div>
            ))}
            <button
              onClick={handleAddTrip}
              className="w-full px-4 py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Add Another Trip
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-2 border border-slate-300 dark:border-slate-600 text-base font-medium rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600"
        >
          Back
        </button>
        <button
          onClick={onContinue}
          disabled={didTravelUS === null}
          className="px-6 py-2 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default TripsPage;
