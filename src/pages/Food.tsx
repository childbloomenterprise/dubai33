import { useState } from "react";
import { MapPin, ArrowUpRight, Utensils, Leaf, Info, Soup } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { dishes } from "../../shared/cuisine";
import { Button, Modal } from "../components/ui";
export function Food({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState("all");
  const navigate = useNavigate();
  return (
    <Modal
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title="A taste of Kerala"
      description="A small introduction to local flavors. These are regional dishes, not verified restaurant menus."
    >
      <div className="pill-tabs">
        <button
          className={filter === "all" ? "active" : ""}
          onClick={() => setFilter("all")}
        >
          All flavors
        </button>
        <button
          className={filter === "vegetarian" ? "active" : ""}
          onClick={() => setFilter("vegetarian")}
        >
          <Leaf size={14} />
          Vegetarian
        </button>
        <button
          className={filter === "nonvegetarian" ? "active" : ""}
          onClick={() => setFilter("nonvegetarian")}
        >
          Nonvegetarian
        </button>
      </div>
      <div className="food-list">
        {dishes
          .filter((d) => filter === "all" || d.diet === filter)
          .map((d) => (
            <article className="food-detail" key={d.id}>
              {d.image ? (
                <img src={d.image} alt={d.name} />
              ) : (
                <div className="food-detail-placeholder" aria-hidden="true">
                  <Soup size={28} />
                </div>
              )}
              <div>
                <span className="eyebrow">
                  {d.diet === "vegetarian" ? "VEGETARIAN" : "CONTAINS FISH"}
                </span>
                <h3>{d.name}</h3>
                <p>{d.ingredients}</p>
                <small>
                  <Info size={13} />
                  Ingredients unverified
                </small>
                <p className="small muted">{d.note}</p>
              </div>
            </article>
          ))}
      </div>
      <Button
        className="full-width"
        onClick={() => {
          onClose();
          navigate("/nearby", { state: { category: "restaurants" } });
        }}
      >
        <MapPin size={17} />
        Find restaurants nearby
        <ArrowUpRight size={16} />
      </Button>
      <p className="small muted food-disclaimer">
        <Utensils size={15} />
        Ask about ingredients and cross-contact if you have allergies.
      </p>
    </Modal>
  );
}
