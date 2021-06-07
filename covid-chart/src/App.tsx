import React, { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider, useQuery } from "react-query";
import Fuse from "fuse.js";
import {
  Combobox,
  ComboboxInput,
  ComboboxPopover,
  ComboboxList,
  ComboboxOption,
} from "@reach/combobox";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Props } from "recharts/types/component/DefaultLegendContent";

import Button from "./lib/Button/Index";
import { ReactComponent as QuestionIcon } from "./media/question-circle-regular.svg";

import "@reach/combobox/styles.css";
import "./global.scss";
import styles from "./App.module.scss";

interface SegmentDataRecord {
  color: string;
  isActive: boolean;
}

enum SegmentType {
  confirmed = "confirmed",
  recovered = "recovered",
  deaths = "deaths",
}
interface SegmentData {
  [SegmentType.confirmed]: SegmentDataRecord;
  [SegmentType.recovered]: SegmentDataRecord;
  [SegmentType.deaths]: SegmentDataRecord;
}

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContents />
    </QueryClientProvider>
  );
}

function AppContents() {
  const [countries, setCountries] = useState<string[]>([]);
  const fuseOptions = {
    includeScore: true,
  };
  const fuse = new Fuse(countries, fuseOptions);
  const initialSegmentData: SegmentData = {
    confirmed: {
      color: "blue",
      isActive: true,
    },
    recovered: {
      color: "green",
      isActive: true,
    },
    deaths: {
      color: "red",
      isActive: true,
    },
  };
  const [selectedCountry, setSelectedCountry] = useState<string>();
  const [searchResults, setSearchResults] = useState<Fuse.FuseResult<string>[]>(
    []
  );
  const [segmentData, setSegmentData] =
    useState<SegmentData>(initialSegmentData);

  const { data } = useQuery("covidData", () =>
    fetch(`https://pomber.github.io/covid19/timeseries.json`).then((res) =>
      res.json()
    )
  );

  const handleSearchChange = (event: React.FormEvent<HTMLInputElement>) => {
    setSearchResults(fuse.search(event.currentTarget.value));
  };

  // Set countries
  useEffect(() => {
    if (data) {
      let _countries: string[] = [];
      for (let country in data) {
        _countries = [..._countries, country];
      }
      setCountries(_countries);
    }
  }, [data]);

  const handleSelectCountry = (country: string) => {
    setSelectedCountry(country);
    setSearchResults([]);
  };

  const handleToggleLegend = (segment: SegmentType) => {
    const mutatedSegment = { ...segmentData[segment] };
    mutatedSegment.isActive = !mutatedSegment.isActive;
    setSegmentData({ ...segmentData, [segment]: { ...mutatedSegment } });
  };

  const renderLegend = (props: Props) => {
    return (
      <div className={styles.legendToolbar} style={{}}>
        {Object.entries(segmentData).map(([key, { color, isActive }]) => (
          <Button
            variant="outline"
            key={key}
            onClick={() => handleToggleLegend(key as keyof SegmentData)}
            aria-pressed={isActive}
          >
            <>
              <svg
                className={styles.legendIcon}
                viewBox="0 0 32 32"
                version="1.1"
              >
                <path
                  strokeWidth="4"
                  fill="none"
                  stroke={color}
                  d="M0,16h10.666666666666666A5.333333333333333,5.333333333333333,0,1,1,21.333333333333332,16H32M21.333333333333332,16A5.333333333333333,5.333333333333333,0,1,1,10.666666666666666,16"
                />
              </svg>
              <span
                style={{ textDecoration: !isActive ? "line-through" : "none" }}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </span>
            </>
          </Button>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <header className="App-header">
        <nav>
          <Combobox
            aria-label="Search by country"
            onSelect={(value: string) => handleSelectCountry(value)}
          >
            <ComboboxInput
              placeholder="Search by country"
              className={styles.input}
              onChange={handleSearchChange}
              selectOnClick
            />
            {searchResults && (
              <ComboboxPopover className={styles.dropOver}>
                {searchResults.length > 0 ? (
                  <ComboboxList>
                    {searchResults.slice(0, 10).map(({ item, refIndex }) => (
                      <ComboboxOption
                        className={styles.dropOverItem}
                        key={refIndex}
                        value={item}
                      />
                    ))}
                  </ComboboxList>
                ) : (
                  <span className={styles.noResultsText}>
                    <QuestionIcon className={styles.noResultsIcon} />
                    Sorry, no countries found! Did you make a typo?
                  </span>
                )}
              </ComboboxPopover>
            )}
          </Combobox>
          <h2 className={styles.toolbarHeading}>Quick access</h2>
          <div className={styles.toolbar}>
            <Button variant="primary" onClick={() => setSelectedCountry("US")}>
              <abbr title="United States of America">USA</abbr>
            </Button>
            <Button
              variant="primary"
              onClick={() => setSelectedCountry("China")}
            >
              China
            </Button>
            <Button
              variant="primary"
              onClick={() => setSelectedCountry("Russia")}
            >
              Russia
            </Button>
            <Button
              variant="primary"
              onClick={() => setSelectedCountry("Brazil")}
            >
              Brazil
            </Button>
          </div>
        </nav>
      </header>

      <main>
        {!selectedCountry && (
          <div className={styles.emptyContainer}>
            <h2>Select a country to see COVID Rates</h2>
          </div>
        )}
        {data && selectedCountry && (
          <div className={styles.chartOuterWrapper}>
            <div className={styles.chartInnerWrapper}>
              <h2 className={styles.chartHeading}>
                {selectedCountry} COVID Rates
              </h2>
              <ResponsiveContainer
                className={styles.chartContainer}
                minHeight={300}
                width="100%"
              >
                <LineChart
                  data={data[selectedCountry]}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date: string) =>
                      new Intl.DateTimeFormat("en-US", {
                        dateStyle: "medium",
                      }).format(new Date(date))
                    }
                    tickMargin={7}
                    tick={{ fontSize: "0.9rem" }}
                  />
                  <YAxis />
                  <Tooltip />
                  <Legend content={renderLegend} />
                  {Object.entries(segmentData)
                    .filter(([_, { isActive }]) => isActive)
                    .map(([key, { color }]) => {
                      return (
                        <Line
                          key={key}
                          type="monotone"
                          dataKey={key}
                          stroke={color}
                        />
                      );
                    })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
