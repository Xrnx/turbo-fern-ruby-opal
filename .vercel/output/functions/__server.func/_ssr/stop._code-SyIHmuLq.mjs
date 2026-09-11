import { i as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { _ as Link, v as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { i as string, r as object } from "../_libs/zod.mjs";
import { a as RefreshCw, d as Accessibility, r as Star, u as ChevronLeft } from "../_libs/lucide-react.mjs";
import { t as useQuery } from "../_libs/tanstack__react-query.mjs";
import { n as Route } from "./router-D8T0GqIP.mjs";
import { a as cn, c as loadStops, d as useSavedStops, r as Skeleton, s as getStop, t as Button } from "./saved-stops-5IcUUCbm.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/stop._code-SyIHmuLq.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var getArrivals = createServerFn({ method: "POST" }).validator(object({ code: string().regex(/^\d{5}$/) })).handler(createSsrRpc("548d4980325f5a1a0b324d3beb3f5a4bb853165c918fa00b8dcf728aa82f6023"));
function formatEta(ms) {
	if (ms == null) return {
		label: "—",
		unit: "",
		arriving: false
	};
	if (ms <= 45e3) return {
		label: "Arr",
		unit: "",
		arriving: true
	};
	const mins = Math.max(1, Math.round(ms / 6e4));
	return {
		label: String(mins),
		unit: mins === 1 ? "min" : "min",
		arriving: false
	};
}
function operatorName(code) {
	switch (code) {
		case "SBST": return "SBS Transit";
		case "SMRT": return "SMRT";
		case "TTS": return "Tower Transit";
		case "GAS": return "Go-Ahead";
		default: return code || "Bus";
	}
}
function loadLabel(load) {
	switch (load) {
		case "SEA": return "Seats";
		case "SDA": return "Standing";
		case "LSD": return "Limited";
		default: return null;
	}
}
function deckLabel(type) {
	switch (type) {
		case "DD": return "Double deck";
		case "BD": return "Bendy";
		case "SD": return "Single";
		default: return null;
	}
}
var ARRIVAL_REFRESH_MS = 15e3;
function LoadPips({ load }) {
	const filled = load === "LSD" ? 3 : load === "SDA" ? 2 : load === "SEA" ? 1 : 0;
	const tone = load === "LSD" ? "bg-bad" : load === "SDA" ? "bg-warn" : "bg-ok";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "inline-flex items-end gap-0.5",
		"aria-label": loadLabel(load) ?? "Load unknown",
		children: [
			1,
			2,
			3
		].map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("w-1 rounded-full", n === 1 ? "h-2" : n === 2 ? "h-2.5" : "h-3.5", n <= filled ? tone : "bg-border") }, n))
	});
}
function EtaChip({ eta }) {
	if (!eta) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "w-14 text-right font-display text-2xl tabular-nums text-subtle",
		children: "—"
	});
	const { label, unit, arriving } = formatEta(eta.duration_ms);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "flex w-14 flex-col items-end leading-none",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: cn("font-display text-3xl font-semibold tabular-nums tracking-tight", arriving ? "text-ok" : "text-foreground"),
			children: label
		}), unit ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "mt-0.5 text-[10px] uppercase tracking-wider text-muted",
			children: unit
		}) : null]
	});
}
function destinationFor(svc, stops) {
	const code = svc.next?.destination_code ?? svc.next2?.destination_code ?? svc.next3?.destination_code;
	if (!code) return operatorName(svc.operator);
	if (svc.next?.origin_code && svc.next.origin_code === code) return stops.get(code)?.name ?? "Loop";
	return stops.get(code)?.name ?? code;
}
function ArrivalList({ services, stopMap }) {
	if (services.length === 0) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-xl border border-border bg-card px-5 py-10 text-center",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-base font-medium",
			children: "No buses right now"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-sm text-muted",
			children: "This stop has no incoming services at the moment."
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
		className: "space-y-2",
		children: services.map((svc, i) => {
			const dest = destinationFor(svc, stopMap);
			const eta = svc.next;
			const wab = eta?.feature === "WAB";
			const deck = deckLabel(eta?.type ?? null);
			const load = loadLabel(eta?.load ?? null);
			return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
				className: cn("halt-rise rounded-xl border border-border bg-card px-4 py-3.5", i < 5 ? `halt-rise-${Math.min(i + 1, 4)}` : ""),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "min-w-14",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-display text-4xl font-bold leading-none tracking-tight",
								children: svc.no
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0 flex-1 pt-0.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "truncate text-sm font-medium",
								children: dest
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: operatorName(svc.operator) }),
									load ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "inline-flex items-center gap-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoadPips, { load: eta?.load ?? null }), load]
									}) : null,
									deck ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: deck }) : null,
									wab ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "inline-flex items-center gap-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Accessibility, { className: "size-3" }), "Accessible"]
									}) : null
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start gap-2 pt-0.5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EtaChip, { eta: svc.next }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(EtaChip, { eta: svc.next2 }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "hidden sm:flex",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EtaChip, { eta: svc.next3 })
								})
							]
						})
					]
				})
			}, svc.no);
		})
	});
}
function StopPage() {
	const { code } = Route.useParams();
	const navigate = useNavigate();
	const valid = /^\d{5}$/.test(code);
	const addRecent = useSavedStops((s) => s.addRecent);
	const toggleSaved = useSavedStops((s) => s.toggleSaved);
	const saved = useSavedStops((s) => s.saved.includes(code));
	const [stop, setStop] = (0, import_react.useState)();
	const [stopMap, setStopMap] = (0, import_react.useState)(/* @__PURE__ */ new Map());
	(0, import_react.useEffect)(() => {
		if (!valid) {
			navigate({ to: "/" });
			return;
		}
		addRecent(code);
		getStop(code).then(setStop);
		loadStops().then(setStopMap);
	}, [
		code,
		valid,
		addRecent,
		navigate
	]);
	const arrivals = useQuery({
		queryKey: ["arrivals", code],
		queryFn: () => getArrivals({ data: { code } }),
		enabled: valid,
		refetchInterval: ARRIVAL_REFRESH_MS
	});
	if (!valid) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-12 pt-[max(0.75rem,env(safe-area-inset-top))]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "mb-6 flex items-start gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "icon",
						asChild: true,
						"aria-label": "Back",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "size-5" })
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1 pt-1.5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-display text-lg font-semibold tabular-nums tracking-wide text-muted",
								children: code
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								className: "truncate text-xl font-medium leading-tight",
								children: stop?.name ?? "Bus stop"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "truncate text-sm text-muted",
								children: stop?.road ?? "Singapore"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "ghost",
						size: "icon",
						"aria-label": saved ? "Remove saved stop" : "Save stop",
						"aria-pressed": saved,
						onClick: () => toggleSaved(code),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, {
							className: cn("size-5", saved ? "fill-primary text-primary" : "text-muted"),
							strokeWidth: 1.75
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-4 flex items-center justify-between text-xs text-muted",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: cn("size-1.5 rounded-full", arrivals.isFetching ? "bg-ok" : "bg-muted") }), arrivals.isError ? "Could not refresh" : "Live · every 15s"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					className: "inline-flex items-center gap-1.5 text-foreground",
					onClick: () => void arrivals.refetch(),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: cn("size-3.5", arrivals.isFetching && "animate-spin") }), "Refresh"]
				})]
			}),
			arrivals.isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-24 w-full rounded-xl" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-24 w-full rounded-xl" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-24 w-full rounded-xl" })
				]
			}) : arrivals.isError ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-xl border border-border bg-card px-5 py-10 text-center",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-base font-medium",
						children: "Arrivals unavailable"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-muted",
						children: arrivals.error instanceof Error ? arrivals.error.message : "Try again in a moment."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						className: "mt-5",
						onClick: () => void arrivals.refetch(),
						children: "Try again"
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrivalList, {
				services: arrivals.data?.services ?? [],
				stopMap
			})
		]
	});
}
//#endregion
export { StopPage as component };
