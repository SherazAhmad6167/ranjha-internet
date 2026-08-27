/**
 * Seeded into Settings > "Recovery Received" the first time it is opened, so
 * the wording can be edited without a code change. Mirrors the operator's
 * recovery template, addressed to the person the cash was handed to.
 */
export const DEFAULT_RECOVERY_RECEIVED_TEMPLATE = `*NASSTEC AIR NET PVT. LTD.*
*RECOVERY RECEIVED | ریکوری موصول*

Dear *{Received By}*,
Recovery has been submitted to you by *{Operator Name}*.

Recovery Date: *{Recovery Date}*
Area: *{Area}*
Total Recovery: *Rs. {Total Recovery}*
Total Expenses: *Rs. {Total Expenses}*
Amount Received: *Rs. {Remaining Amount}*
Operator Contact: *{Operator Phone}*

*NASSTEC AIR NET PVT. LTD.*
---
محترم *{Received By}*،
*{Operator Name}* کی جانب سے ریکوری آپ کو جمع کروائی گئی ہے۔

تاریخ: *{Recovery Date}*
علاقہ: *{Area}*
کل ریکوری: *Rs. {Total Recovery}*
کل اخراجات: *Rs. {Total Expenses}*
موصول رقم: *Rs. {Remaining Amount}*
آپریٹر رابطہ: *{Operator Phone}*

*NASSTEC AIR NET PVT. LTD.*`;
