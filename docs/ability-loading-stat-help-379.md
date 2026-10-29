# Ability artwork and character stat help

Reproduced: repeated live character switching left the shared ArtworkLoading queue running five disconnected lazy image jobs; later characters had blank icons queued behind them. Ability cards now load eagerly via direct source attributes with their own narrowly scoped recovery handler. All 103 existing unique ability WebP illustrations are shipped as 128px compressed runtime assets (439,006 bytes total), served by the game itself; original full-size art is retained. GitHub originals are fallback only.

Status overview offers short native hover explanations on STR, AGI, MAG, STAM, ECHO, HP, MP, CRIT RATE, DMG / ACTION, HEAL / ACTION and EVASION. Character-specific scaling, learned strongest damage/heal and chosen stamina talent are reflected. No stat values, saves or combat formulas changed.
