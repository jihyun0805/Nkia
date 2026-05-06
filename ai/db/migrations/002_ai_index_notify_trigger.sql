-- ============================================================
-- AI 색인 변경 알림 트리거
-- 적용 대상: dump_* 색인 대상 테이블 15개 + product_module
--
-- 실행 방법:
--   psql -U orbis -d orbis_db -f 002_ai_index_notify_trigger.sql
-- ============================================================

-- 트리거 함수: INSERT/UPDATE/DELETE 후 pg_notify 발행
CREATE OR REPLACE FUNCTION public.notify_ai_index_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_notify(
    'ai_index_change',
    json_build_object(
      'table', TG_TABLE_NAME,
      'op',    TG_OP,
      'id',    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END
    )::text
  );
  RETURN NULL;  -- AFTER 트리거이므로 반환값 무시됨
END;
$$;

-- 색인 대상 테이블에 트리거 일괄 등록
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    -- dump_* 색인 대상 (INDEXED_CONFIGS 와 동기화 유지)
    'dump_opportunities',
    'dump_quotes',
    'dump_prbs',
    'dump_prb_results',
    'dump_proposals',
    'dump_contracts',
    'dump_projects',
    'dump_project_reports',
    'dump_maintenance_contracts',
    'dump_maintenance_quotes',
    'dump_customer_supports',
    'dump_companies',
    'dump_contacts',
    'dump_licenses',
    'dump_billings',
    -- always-indexed
    'product_module'
  ] LOOP
    -- 테이블이 없으면 건너뜀 (환경별 차이 허용)
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format(
        'DROP TRIGGER IF EXISTS trg_ai_index_notify ON public.%I;
         CREATE TRIGGER trg_ai_index_notify
           AFTER INSERT OR UPDATE OR DELETE ON public.%I
           FOR EACH ROW EXECUTE FUNCTION public.notify_ai_index_change();',
        tbl, tbl
      );
      RAISE NOTICE 'trg_ai_index_notify → %', tbl;
    ELSE
      RAISE NOTICE '테이블 없음, 건너뜀: %', tbl;
    END IF;
  END LOOP;
END $$;
