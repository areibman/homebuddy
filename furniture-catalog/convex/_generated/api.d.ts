/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as account from "../account.js";
import type * as arrangements from "../arrangements.js";
import type * as auth from "../auth.js";
import type * as billing from "../billing.js";
import type * as credits from "../credits.js";
import type * as furniture from "../furniture.js";
import type * as homes from "../homes.js";
import type * as http from "../http.js";
import type * as plans from "../plans.js";
import type * as stripeNode from "../stripeNode.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  account: typeof account;
  arrangements: typeof arrangements;
  auth: typeof auth;
  billing: typeof billing;
  credits: typeof credits;
  furniture: typeof furniture;
  homes: typeof homes;
  http: typeof http;
  plans: typeof plans;
  stripeNode: typeof stripeNode;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
