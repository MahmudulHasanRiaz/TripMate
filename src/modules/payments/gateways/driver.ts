import "server-only";
import { PaymentError, type PaymentView } from "../service";
import type { GatewayKind } from "../validation";

/**
 * Payment gateway drivers — the seam between a gateway's checkout flow and the
 * rest of the payments module. Server-only: drivers eventually carry
 * integration credentials (env-injected, never the jsonb config column) and
 * talk to hosted checkout APIs, none of which belongs in a client bundle.
 *
 * v1 scope (deliberately small):
 *   - `manual`   → initiate returns the gateway's stored instructions (the
 *                  send-money number/process the customer follows); verify is
 *                  a no-op — an operator verifies through verifyPayment.
 *   - `paylater` → initiate returns kind "manual" with a pay-later note (the
 *                  "checkout" is just a message); verify is a no-op.
 *   - `sslcommerz` → stub that throws PaymentError("NOT_IMPLEMENTED") on both
 *                  methods; the hosted integration lands later.
 *   - `bkash`/`nagad` → served by the manual driver in v1 (send-money + txn id
 *                  + operator verification — the seeded flow); a hosted driver
 *                  replaces them when those integrations are built.
 *
 * The driver is the CUSTOMER-FACING checkout surface (the portal's "how do I
 * pay" step, wired in Plan 5 T4). The v1 verification path is fully
 * service-side — nothing in this file is on the verify/reject critical path.
 * Import direction is one-way (driver → service for PaymentError); the service
 * never imports this file, so there is no cycle.
 */

/** What a driver's initiate returns: either manual instructions to show the
 *  customer, or a redirect to a hosted checkout. */
export type GatewayInitiateResult = {
  kind: "manual" | "external";
  instructions?: string;
  redirectUrl?: string;
};

/** The order facts a driver needs to start a checkout (amount in the order's
 *  currency). */
export type GatewayDriverOrder = {
  id: string;
  orderNo: string;
  currency: string;
  amount: number;
};

/** The gateway row facts a driver needs (config is the display-only record). */
export type GatewayDriverGateway = {
  id: string;
  name: string;
  kind: GatewayKind;
  config: Record<string, string> | null;
  instructions: string | null;
};

export interface PaymentGatewayDriver {
  /** Start a payment for an order on this gateway. */
  initiate(
    order: GatewayDriverOrder,
    gateway: GatewayDriverGateway,
  ): Promise<GatewayInitiateResult>;
  /** Run the gateway's machine-side verification (hosted checkouts call their
   *  status API here). Manual flows need none — an operator decides. */
  verify(payment: PaymentView): Promise<void>;
}

/** Manual flow: show the stored instructions (the number to send money to and
 *  the process to follow). The config record carries the display data the
 *  portal renders alongside (account number, bank name). */
const manualDriver: PaymentGatewayDriver = {
  async initiate(_order, gateway) {
    return { kind: "manual", instructions: gateway.instructions ?? undefined };
  },
  async verify() {
    // No machine check — an operator verifies via verifyPayment.
  },
};

/** Pay-later flow: the "checkout" is a note telling the customer the team will
 *  arrange payment; the payment row (status pending) records the intent. */
const PAY_LATER_NOTE =
  "Pay later selected — our team will contact you to arrange payment before departure.";

const paylaterDriver: PaymentGatewayDriver = {
  async initiate() {
    return { kind: "manual", instructions: PAY_LATER_NOTE };
  },
  async verify() {
    // No machine check — settlement is recorded by an operator.
  },
};

/** SSLCommerz hosted checkout — not implemented yet; both surfaces refuse. */
const sslcommerzDriver: PaymentGatewayDriver = {
  async initiate() {
    throw new PaymentError(
      "NOT_IMPLEMENTED",
      "The SSLCommerz checkout is not implemented yet.",
    );
  },
  async verify() {
    throw new PaymentError(
      "NOT_IMPLEMENTED",
      "SSLCommerz payment verification is not implemented yet.",
    );
  },
};

/** Resolve the driver for a gateway kind. */
export function getGatewayDriver(kind: GatewayKind): PaymentGatewayDriver {
  switch (kind) {
    case "manual":
    // v1: bKash/Nagad gateways are manually verified (send-money + txn id) —
    // see the module header; hosted drivers replace these cases later.
    case "bkash":
    case "nagad":
      return manualDriver;
    case "paylater":
      return paylaterDriver;
    case "sslcommerz":
      return sslcommerzDriver;
  }
}
