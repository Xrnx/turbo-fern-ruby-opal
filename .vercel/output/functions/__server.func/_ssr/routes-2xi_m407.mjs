import { i as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { v as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { a as DialogPortal, i as DialogOverlay, n as DialogClose, o as DialogTitle, r as DialogContent, t as Dialog } from "../_libs/@radix-ui/react-dialog+[...].mjs";
import { c as Delete, i as Search, l as ChevronRight, o as MapPin, s as LocateFixed, t as X } from "../_libs/lucide-react.mjs";
import { a as cn, d as useSavedStops, i as allStops, l as nearbyStops, n as SUGGESTED_STOPS, o as formatDistance, r as Skeleton, s as getStop, t as Button, u as searchStops } from "./saved-stops-5IcUUCbm.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-2xi_m407.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var KEYS = [
	"1",
	"2",
	"3",
	"4",
	"5",
	"6",
	"7",
	"8",
	"9"
];
function Keypad({ code, onCodeChange, onNearby, onSearch }) {
	const navigate = useNavigate();
	(0, import_react.useEffect)(() => {
		if (code.length !== 5) return;
		const t = window.setTimeout(() => {
			navigate({
				to: "/stop/$code",
				params: { code }
			});
		}, 80);
		return () => window.clearTimeout(t);
	}, [code, navigate]);
	(0, import_react.useEffect)(() => {
		function onKey(e) {
			if (e.metaKey || e.ctrlKey || e.altKey) return;
			const target = e.target;
			if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
			if (e.key >= "0" && e.key <= "9") {
				e.preventDefault();
				onCodeChange((code + e.key).slice(0, 5));
			} else if (e.key === "Backspace") {
				e.preventDefault();
				onCodeChange(code.slice(0, -1));
			} else if (e.key === "Escape") onCodeChange("");
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [code, onCodeChange]);
	function press(digit) {
		if (code.length >= 5) return;
		onCodeChange(code + digit);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex justify-center gap-2",
				"aria-label": "Stop code",
				"aria-live": "polite",
				children: Array.from({ length: 5 }).map((_, i) => {
					const filled = i < code.length;
					const active = i === code.length && code.length < 5;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: cn("flex h-16 w-12 items-center justify-center rounded-md border bg-card font-display text-4xl font-semibold tabular-nums", filled ? "border-primary/40 text-foreground" : "border-border text-subtle"),
						children: filled ? code[i] : active ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "halt-caret h-8 w-0.5 rounded-full bg-primary" }) : null
					}, i);
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-3 gap-2",
				children: [
					KEYS.map((k) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "key",
						size: "key",
						onClick: () => press(k),
						"aria-label": `Digit ${k}`,
						children: k
					}, k)),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						type: "button",
						variant: "subtle",
						size: "key",
						className: "text-sm font-sans font-medium",
						onClick: onNearby,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LocateFixed, { className: "size-5" }), "Near"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "key",
						size: "key",
						onClick: () => press("0"),
						"aria-label": "Digit 0",
						children: "0"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "subtle",
						size: "key",
						"aria-label": "Delete",
						onClick: () => onCodeChange(code.slice(0, -1)),
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Delete, { className: "size-6" })
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				type: "button",
				variant: "outline",
				className: "h-12 rounded-lg",
				onClick: onSearch,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "size-4" }), "Search by name"]
			})
		]
	});
}
function StopRow({ stop, meta, onPick }) {
	const navigate = useNavigate();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		type: "button",
		onClick: () => {
			onPick?.(stop.code);
			navigate({
				to: "/stop/$code",
				params: { code: stop.code }
			});
		},
		className: cn("flex w-full items-center gap-3 rounded-lg bg-card px-4 py-3.5 text-left", "transition-[background-color,transform] duration-150 ease-out", "hover:bg-card-2 active:scale-[0.99]"),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "flex size-10 shrink-0 items-center justify-center rounded-sm bg-card-2 text-muted",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, {
					className: "size-4",
					strokeWidth: 1.75
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "min-w-0 flex-1",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "flex items-baseline gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-display text-lg font-semibold tabular-nums tracking-wide",
							children: stop.code
						}), meta ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs text-muted",
							children: meta
						}) : null]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block truncate text-sm text-foreground",
						children: stop.name
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block truncate text-xs text-muted",
						children: stop.road
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "size-4 shrink-0 text-subtle" })
		]
	});
}
function NearbyPanel({ open, onOpenChange }) {
	const [state, setState] = (0, import_react.useState)({ status: "loading" });
	(0, import_react.useEffect)(() => {
		if (!open) return;
		setState({ status: "loading" });
		let cancelled = false;
		if (!navigator.geolocation) {
			setState({
				status: "denied",
				message: "Location is not available on this device."
			});
			return;
		}
		navigator.geolocation.getCurrentPosition(async (pos) => {
			try {
				const stops = await allStops();
				if (cancelled) return;
				const rows = nearbyStops(stops, pos.coords.latitude, pos.coords.longitude, 12);
				setState({
					status: "ready",
					rows
				});
			} catch {
				if (!cancelled) setState({
					status: "denied",
					message: "Could not load nearby stops."
				});
			}
		}, (err) => {
			if (cancelled) return;
			const message = err.code === err.PERMISSION_DENIED ? "Location permission is off. Enable it to find stops around you." : "Could not read your location. Try again from the pavement.";
			setState({
				status: "denied",
				message
			});
		}, {
			enableHighAccuracy: true,
			timeout: 8e3,
			maximumAge: 3e4
		});
		return () => {
			cancelled = true;
		};
	}, [open]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, { className: "fixed inset-0 z-40 bg-background/80" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "fixed inset-x-0 top-0 z-50 mx-auto flex h-dvh w-full max-w-lg flex-col bg-background px-4 pb-6 pt-[max(1rem,env(safe-area-inset-top))]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-4 flex items-center justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
					className: "text-base font-medium",
					children: "Nearby stops"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogClose, {
					asChild: true,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "icon",
						"aria-label": "Close nearby",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {})
					})
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "min-h-0 flex-1 space-y-2 overflow-y-auto",
				children: state.status === "loading" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-20 w-full rounded-lg" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-20 w-full rounded-lg" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Skeleton, { className: "h-20 w-full rounded-lg" })
				] }) : state.status === "denied" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "px-1 text-sm text-muted",
					children: state.message
				}) : state.rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "px-1 text-sm text-muted",
					children: "No stops found nearby."
				}) : state.rows.map(({ stop, meters }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StopRow, {
					stop,
					meta: formatDistance(meters),
					onPick: () => onOpenChange(false)
				}, stop.code))
			})]
		})] })
	});
}
function Input({ className, type, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		type,
		className: cn("flex h-12 w-full rounded-md border border-border bg-card px-4 text-base text-foreground", "placeholder:text-subtle outline-none transition-[border-color,box-shadow] duration-150", "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40", "disabled:cursor-not-allowed disabled:opacity-50", className),
		...props
	});
}
function SearchPanel({ open, onOpenChange }) {
	const [query, setQuery] = (0, import_react.useState)("");
	const [stops, setStops] = (0, import_react.useState)([]);
	(0, import_react.useEffect)(() => {
		if (!open) return;
		let cancelled = false;
		allStops().then((list) => {
			if (!cancelled) setStops(list);
		});
		return () => {
			cancelled = true;
		};
	}, [open]);
	(0, import_react.useEffect)(() => {
		if (!open) setQuery("");
	}, [open]);
	const results = (0, import_react.useMemo)(() => searchStops(stops, query, 24), [stops, query]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, { className: "fixed inset-0 z-40 bg-background/80" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "fixed inset-x-0 top-0 z-50 mx-auto flex h-dvh w-full max-w-lg flex-col bg-background px-4 pb-6 pt-[max(1rem,env(safe-area-inset-top))]",
			"aria-describedby": void 0,
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-4 flex items-center justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
						className: "text-base font-medium",
						children: "Search stops"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogClose, {
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "icon",
							"aria-label": "Close search",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, {})
						})
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
					className: "sr-only",
					htmlFor: "stop-search",
					children: "Stop name or code"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						id: "stop-search",
						autoFocus: true,
						value: query,
						onChange: (e) => setQuery(e.target.value),
						placeholder: "Amber Gdns, Orchard, 92241",
						className: "pl-10"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto",
					children: query.trim().length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "px-1 text-sm text-muted",
						children: "Type a stop name, road, or 5-digit code."
					}) : results.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "px-1 text-sm text-muted",
						children: [
							"No stops match “",
							query.trim(),
							"”."
						]
					}) : results.map((stop) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StopRow, {
						stop,
						onPick: () => onOpenChange(false)
					}, stop.code))
				})
			]
		})] })
	});
}
function Home() {
	const [code, setCode] = (0, import_react.useState)("");
	const [searchOpen, setSearchOpen] = (0, import_react.useState)(false);
	const [nearbyOpen, setNearbyOpen] = (0, import_react.useState)(false);
	const saved = useSavedStops((s) => s.saved);
	const recents = useSavedStops((s) => s.recents);
	const [catalog, setCatalog] = (0, import_react.useState)({});
	const heading = saved.length > 0 ? "Saved" : recents.length > 0 ? "Recent" : "Try a stop";
	const codes = (0, import_react.useMemo)(() => saved.length > 0 ? saved : recents.length > 0 ? recents : [...SUGGESTED_STOPS], [saved, recents]);
	const codeKey = codes.join("|");
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		const list = codeKey.split("|").filter(Boolean);
		Promise.all(list.map((c) => getStop(c))).then((rows) => {
			if (cancelled) return;
			const next = {};
			rows.forEach((stop, i) => {
				const key = list[i];
				if (stop && key) next[key] = stop;
			});
			setCatalog(next);
		});
		return () => {
			cancelled = true;
		};
	}, [codeKey]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))]",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "halt-rise mb-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-medium uppercase tracking-[0.22em] text-muted",
						children: "Singapore buses"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "mt-2 font-display text-6xl font-bold leading-none tracking-tight",
						children: "Halt"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-3 max-w-sm text-sm text-muted text-pretty",
						children: "Type the 5-digit code on the pole. Incoming buses show up immediately — no menus, no extra taps."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
				className: "halt-rise halt-rise-1",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Keypad, {
					code,
					onCodeChange: setCode,
					onNearby: () => setNearbyOpen(true),
					onSearch: () => setSearchOpen(true)
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "halt-rise halt-rise-2 mt-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mb-3 text-xs font-medium uppercase tracking-[0.18em] text-muted",
					children: heading
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "space-y-2",
					children: codes.map((c) => {
						const stop = catalog[c];
						if (!stop) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-20 animate-pulse rounded-lg bg-card" }, c);
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StopRow, { stop }, c);
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SearchPanel, {
				open: searchOpen,
				onOpenChange: setSearchOpen
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NearbyPanel, {
				open: nearbyOpen,
				onOpenChange: setNearbyOpen
			})
		]
	});
}
//#endregion
export { Home as component };
