-- Connect Team — les trois feedbacks du manager (cours « Le feed-back et la méthode DESC ») :
-- reconnaissance, amélioration, recadrage. Les anciennes valeurs (point fort, axe de progrès)
-- sont converties dans la migration suivante (une nouvelle valeur d'enum n'est utilisable
-- qu'après la validation de la transaction qui l'ajoute).

alter type public.feedback_kind add value if not exists 'amelioration';
alter type public.feedback_kind add value if not exists 'recadrage';
