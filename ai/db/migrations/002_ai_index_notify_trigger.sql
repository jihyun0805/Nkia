-- ============================================================
-- AI 색인 변경 알림 트리거
-- 적용 대상: 현재 public 엔티티 색인 대상 테이블 + product_module
--
-- 실행 방법:
--   psql -U orbis -d orbis_db -f 002_ai_index_notify_trigger.sql
-- ============================================================

-- 트리거 함수: INSERT/UPDATE/DELETE 후 pg_notify 발행
--
-- 테이블별 PK 컬럼명이 다양 (id / prb_result_id / won_report_code 등) 하므로
-- row_to_json + 동적 컬럼 lookup 으로 안전하게 추출.
-- 우선순위: id → <table>_id → null
CREATE OR REPLACE FUNCTION public.notify_ai_index_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  row_data jsonb;
  row_id   text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    row_data := to_jsonb(OLD);
  ELSE
    row_data := to_jsonb(NEW);
  END IF;
  row_id := COALESCE(
    row_data ->> 'id',
    row_data ->> (TG_TABLE_NAME || '_id'),
    NULL
  );
  PERFORM pg_notify(
    'ai_index_change',
    json_build_object(
      'table', TG_TABLE_NAME,
      'op',    TG_OP,
      'id',    row_id,
      'eventAt', clock_timestamp()
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
    -- INDEXED_CONFIGS / CURRENT_PUBLIC_CONFIGS 와 동기화 유지
    'project_opportunity',
    'sales_activity',
    'quotation',
    'rfp_analyze_result',
    'rfp_analyze_requirement',
    'rfp_requirement',
    'prb',
    'prb_result',
    'proposal',
    'bid_result',
    'order_report',
    'contract',
    'project',
    'project_result_report',
    'maintenance',
    'maintenance_quotation',
    'customer_support',
    'company',
    'company_manager',
    'license',
    'billing',
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
