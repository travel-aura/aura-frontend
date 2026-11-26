// Run: node --experimental-strip-types --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  groupCities, groupCountries, buildStops, orderRoute, buildGuides, findGuide, commonCities,
  googleMapsWalkUrl, encodePolyline, atlasMapUrl, guideMapUrl, routeLengthM, isMappable, filterByCountry,
} from "../src/lib/atlas.ts";

let n = 0;
const post = (over) => ({ id: `p${++n}`, title: `Post ${n}`, image_urls: [`https://x/${n}.jpg`], lat: 38.7, lng: -9.1, tags: [], city_name: "Lisboa", country_code: "pt", ...over });

test("hidden, zero and missing coordinates never go on a map", () => {
  assert.equal(isMappable(post({ location_hidden: true })), false);
  assert.equal(isMappable(post({ lat: 0, lng: 0 })), false);
  assert.equal(isMappable(post({ lat: NaN })), false);
  assert.equal(isMappable(post({})), true);
});

test("groups by city and country, biggest first, center ignores hidden posts", () => {
  const posts = [
    post({ lat: 38.70, lng: -9.10 }), post({ lat: 38.72, lng: -9.14 }),
    post({ lat: 99, lng: 99, location_hidden: true }),
    post({ city_name: "Porto", lat: 41.15, lng: -8.61 }),
    post({ city_name: "Lisboa", country_code: "us", lat: 40, lng: -80 }), // a different Lisboa
    post({ city_name: null }),
  ];
  const cities = groupCities(posts);
  assert.deepEqual(cities.map((c) => [c.city, c.countryCode, c.posts.length, c.mappable.length]),
    [["Lisboa", "pt", 3, 2], ["Lisboa", "us", 1, 1], ["Porto", "pt", 1, 1]]);
  assert.ok(Math.abs(cities[0].center.lat - 38.71) < 1e-9);
  const countries = groupCountries(posts);
  assert.deepEqual(countries, [
    { countryCode: "pt", cityCount: 2, postCount: 5 },
    { countryCode: "us", cityCount: 1, postCount: 1 },
  ]);
  assert.equal(filterByCountry(posts, "US").length, 1);
  assert.equal(filterByCountry(posts, null).length, posts.length);
});

test("several shots of one place make one stop; sunset tags mark it evening", () => {
  const stops = buildStops([
    post({ place_id: "a", place_name: "Miradouro" }), post({ place_id: "a", tags: ["Sunset"] }),
    post({ place_id: "b" }), post({ location_hidden: true }),
  ]);
  assert.equal(stops.length, 2);
  assert.equal(stops[0].name, "Miradouro");
  assert.equal(stops[0].posts.length, 2);
  assert.equal(stops[0].evening, true);
  assert.equal(stops[1].evening, false);
});

test("route visits points along a line in order and puts sunset spots last", () => {
  // Points on a line, shuffled; one sunset spot in the middle of the line
  const mk = (i, evening = false) => ({ id: `s${i}`, name: `${i}`, lat: 38.7, lng: -9.2 + i * 0.01, posts: [], evening });
  const stops = [mk(3), mk(0), mk(5, true), mk(1), mk(4), mk(2)];
  const order = orderRoute(stops).map((s) => s.name);
  assert.equal(order[order.length - 1], "5");
  const day = order.slice(0, -1);
  const asc = ["0", "1", "2", "3", "4"];
  assert.ok(JSON.stringify(day) === JSON.stringify(asc) || JSON.stringify(day) === JSON.stringify([...asc].reverse()), day.join());
});

test("route is never longer than the input order on random spots", () => {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 20; k++) {
    const stops = Array.from({ length: 8 }, (_, i) => ({ id: `${i}`, name: `${i}`, lat: 25 + rnd() * 0.05, lng: 121.5 + rnd() * 0.05, posts: [], evening: false }));
    assert.ok(routeLengthM(orderRoute(stops)) <= routeLengthM(stops) + 1);
    assert.equal(orderRoute(stops).length, 8);
  }
});

test("a city needs 3 distinct visible spots to be a guide", () => {
  const posts = [
    post({ place_id: "a", lat: 38.71, lng: -9.13 }), post({ place_id: "a", lat: 38.71, lng: -9.13 }),
    post({ place_id: "b", lat: 38.72, lng: -9.14 }),
    post({ place_id: "c", location_hidden: true }),
    post({ city_name: "Porto", place_id: "d", lat: 41.1, lng: -8.6 }),
  ];
  assert.equal(buildGuides(posts).length, 0);
  posts.push(post({ place_id: "e", lat: 38.70, lng: -9.15 }));
  const guides = buildGuides(posts);
  assert.equal(guides.length, 1);
  assert.equal(guides[0].stops.length, 3);
  assert.equal(guides[0].postIds.length, 4);
  assert.ok(guides[0].distanceM > 0);
  assert.ok(findGuide(posts, "lisboa", "PT"));
  assert.equal(findGuide(posts, "Porto", "pt"), null);
});

test("common cities match on country when both know it", () => {
  const mine = [{ city: "Lisboa", country_code: "pt" }, { city: "Hong Kong", country_code: null }, { city: "Paris", country_code: "fr" }];
  const theirs = [{ city: "lisboa", country_code: "PT" }, { city: "Hong Kong", country_code: "hk" }, { city: "Paris", country_code: "us" }];
  assert.deepEqual(commonCities(mine, theirs).map((c) => c.city), ["lisboa", "Hong Kong"]);
});

test("Google Maps link uses origin, waypoints and destination, max 11 stops", () => {
  const pts = Array.from({ length: 13 }, (_, i) => ({ lat: 38.7 + i / 1000, lng: -9.1 }));
  const { url, truncated } = googleMapsWalkUrl(pts);
  const u = new URL(url);
  assert.equal(truncated, true);
  assert.equal(u.searchParams.get("travelmode"), "walking");
  assert.equal(u.searchParams.get("origin"), "38.7,-9.1");
  assert.equal(u.searchParams.get("destination"), "38.71,-9.1");
  assert.equal(u.searchParams.get("waypoints").split("|").length, 9);
  assert.equal(googleMapsWalkUrl(pts.slice(0, 2)).truncated, false);
  assert.equal(new URL(googleMapsWalkUrl(pts.slice(0, 2)).url).searchParams.get("waypoints"), null);
});

test("polyline encoding matches Google's reference example", () => {
  assert.equal(encodePolyline([{ lat: 38.5, lng: -120.2 }, { lat: 40.7, lng: -120.95 }, { lat: 43.252, lng: -126.453 }]), "_p~iF~ps|U_ulLnnqC_mqNvxq`@");
});

test("map URLs: pins sized and labelled; single point uses a fixed zoom; no token, no map", () => {
  const cities = groupCities([post({}), post({}), post({}), post({ city_name: "Porto", lat: 41.15, lng: -8.61 })]);
  const url = atlasMapUrl(cities, { token: "tok" });
  assert.match(url, /pin-m-3\+b85c38\(-9\.1,38\.7\)/);
  assert.match(url, /pin-s\+b85c38\(-8\.61,41\.15\)/);
  assert.match(url, /\/auto\//);
  assert.match(atlasMapUrl(cities.slice(0, 1), { token: "tok" }), /\/-9\.1,38\.7,9,0\//);
  assert.equal(atlasMapUrl(cities, { token: "" }), null);
  const g = guideMapUrl([{ lat: 38.7, lng: -9.1 }, { lat: 38.71, lng: -9.12 }], { token: "tok" });
  assert.match(g, /path-3\+b85c38-0\.7\(/);
  assert.match(g, /pin-s-2\+b85c38/);
});
