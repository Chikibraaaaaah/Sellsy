import json,sys,os
OUT=sys.argv[1]
F={ # v1 method families (verbatim names from https://docs.sellsy.com/api/v1/documentation/methods table of contents)
 'Client':['getList','getOne','getAddress','getContact','create','update','delete','updateOwner','addAddress','addContact','updateAddress','updateContact','deleteAddress','deleteContact','updateContactPicture','updatePrefs','transformToProspect','getBankAccountList','updateThirdPicture','updateSharingGroups','updateSharingStaffs','getMargin'],
 'Prospects':['getList','getOne','create','update','delete','updateOwner','getAddress','getContact','addAddress','addContact','updateAddress','updateContact','deleteAddress','deleteContact','updatePrefs','updateContactPicture','transformToCustomer','updateThirdPicture','updateSharingGroups','updateSharingStaffs'],
 'Supplier':['getList','getOne','getAddress','getContact','create','update','delete','updateOwner','addAddress','addContact','updateAddress','updateContact','deleteAddress','deleteContact'],
 'Peoples':['getList','getOne','create','update','delete','updateOwner','getAddresses','unlinkThirds','updateSharingGroups','updateSharingStaffs'],
 'Catalogue':['getList','getOne','create','update','delete','updateOwner','getVariations','getVariation','getVariationFields','getVariationFieldsItem','createVariationField','updateVariationField','deleteVariationCollection','deleteVariationFields','activateVariations','createVariations','updateVariation','deleteVariation','getPrices','updatePrice','getBarCodes','createBarCode','updateBarCode','deleteBarCode','getCategories','getCategory','getParentCategories','getChildrenFromParentId','createCategory','updateCategory','deleteCategory','addPictureToGallery','updateTranslations','updateSharingGroups'],
 'Document':['getList','getOne','getPublicLink','getPublicLink_v2','getNextIdent','create','update','updateDeadlines','updateOwner','updateStep','validate','getModel','updateDeliveryStep','sendDocByMail','getPaymentList','getPayment','getForCopy','createPayment','deletePayment','getPaymentUrl','updateFields','linkPurchase','getLinkedDocuments','getTree','updateSharingGroups','enablePublicLink','disablePublicLink','getNumberingDraftStatus'],
 'Opportunities':['getList','getOne','create','update','delete','getFunnels','getStepsForFunnel','getSources','getSource','createSource','updateSource','deleteSource','updateStatus','updateStep','updateOwner','updateLinkedDocuments','getCurrentIdent','updateSharingGroups','updateDefaultDocument','updateSharingStaffs'],
 'Agenda':['getList','getOne','create','update','delete','updateOwner','updateStatus','getAvailableRappels','getAvailableLabels','getLabel','createLabel','updateLabel','deleteLabel'],
 'Annotations':['getList','getOne','create','update','delete','updateOwner'],
 'Payments':['getList','create','delete'],
 'CustomFields':['getList','getOne','create','update','delete','recordValues','getGroupsList','createGroup','updateGroup','deleteGroup'],
 'SmartTags':['getList','assign','unassign'],
 'Staffs':['getList','getGroups'],
 'Purchase':['getList','getOne','create','update','delete','updateStep','updateDeliveryStep','updateOwner','getPublicLink','getNextIdent','getPayments','updateSharingGroups'],
 'Expense':['getList','getOne','create','update','delete','getNextIdent','uploadRelatedFile'],
 'Timetracking':['getList','getOrderedList','getOne','create','update','delete'],
 'Stock':['getMoves','getForItem','getWarehouses','getWarehouse','createWarehouse','updateWarehouse','deleteWarehouse','setDefaultWarehouse','activate','desactivate','reactivate','add','updateThresHold','getPrefs'],
 'Support':['getList','getOne','getConversation','deleteConversation','create','reply','updateReply','updateAssignation','updateStep','updateThird','getTemplates'],
 'BankAccounts':['getList','getOne','create','update','delete','massCreate','massUpdate'],
 'Addresses':['getList','getOne','create','update','delete'],
 'Accountdatas':['getTaxes','getTaxe','deleteTaxe','getUnits','getUnit','createUnit','createUnits','updateUnit','updateUnits','deleteUnit','getPayMediums','getPayMedium','createPayMedium','updatePayMedium','deletePayMedium','getRateCategories','getRateCategory'],
 'Accounting':['getList','getOne','create','update','delete','getPrefs'],
 'Briefcase':['getList','uploadFile','delete','getRootFolders'],
}
DOC_NOTE="v1 Document.* couvre plusieurs types via un paramètre de type de document (doctype). Valeur exacte à vérifier dans la doc v1."
M={ # object folder -> (families, note, v1Only)
 'companies':(['Client','Prospects','Supplier'],"En v1, sociétés clientes, prospects et fournisseurs sont trois familles distinctes.",False),
 'individuals':(['Client','Prospects'],"En v1 un particulier est un tiers de type personne (à vérifier dans Client.create).",False),
 'contacts':(['Peoples'],"",False),
 'items':(['Catalogue','Stock'],"Stock.* n'a pas d'équivalent v2 dans l'inventaire.",False),
 'estimates':(['Document'],DOC_NOTE,False),'orders':(['Document'],DOC_NOTE,False),'invoices':(['Document'],DOC_NOTE,False),
 'credit-notes':(['Document'],DOC_NOTE,False),'deposit-invoices':(['Document'],DOC_NOTE,False),'progress-invoices':(['Document'],DOC_NOTE,False),
 'deliveries':(['Document'],DOC_NOTE,False),
 'opportunities':(['Opportunities'],"",False),
 'calendar-events':(['Agenda'],"",False),
 'tasks':(['Agenda'],"Rapprochement tâches v2 <-> Agenda v1 non confirmé.",False),
 'comments':(['Annotations'],"",False),
 'payments':(['Payments','Document'],"v2 n'a pas de POST /payments : création via Document.createPayment (v1) ou les routes de paiement des documents en v2.",False),
 'custom-fields':(['CustomFields'],"v2 ne permet que la lecture des champs personnalisés : création via v1.",False),
 'smart-tags':(['SmartTags'],"",False),
 'staffs':(['Staffs'],"",False),
 'taxes':(['Accountdatas'],"",False),
 'rate-categories':(['Accountdatas'],"",False),
 'accounting-codes':(['Accounting'],"",False),
 'purchases':(['Purchase'],"Achats fournisseurs : pas de ressource v2 dans l'inventaire (seulement l'OCR).",True),
 'expenses':(['Expense'],"Notes de frais : v1 uniquement.",True),
 'timetracking':(['Timetracking'],"Temps passés : v1 uniquement.",True),
 'support':(['Support'],"Tickets support : v1 uniquement.",True),
 'bank-accounts':(['BankAccounts'],"v2 : lecture seule (GET /bank-accounts).",False),
 'addresses':(['Addresses'],"v2 : lecture GET /addresses ; écriture via /companies/{id}/addresses etc.",False),
 'units':(['Accountdatas'],"v2 : lecture seule (GET /units).",False),
 'briefcase':(['Briefcase'],"Fichiers : v1.",True),
}
for obj,(fams,note,v1only) in M.items():
    d=f'{OUT}/{obj}'; os.makedirs(d,exist_ok=True)
    methods=[f'{f}.{m}' for f in fams for m in F[f]]
    json.dump({'object':obj,'apiVersion':'v1','endpoint':'https://apifeed.sellsy.com/0/','v1Only':v1only,'note':note,
               'source':'https://docs.sellsy.com/api/v1/documentation/methods','methods':methods},open(f'{d}/v1.methods.json','w'),indent=2,ensure_ascii=False)
for obj in sorted(os.listdir(OUT)):
    if os.path.isdir(f'{OUT}/{obj}') and not os.path.exists(f'{OUT}/{obj}/v1.methods.json'):
        json.dump({'object':obj,'apiVersion':'v1','endpoint':'https://apifeed.sellsy.com/0/','v1Only':False,'note':'Aucune famille v1 rapprochée pour l\'instant.','source':'https://docs.sellsy.com/api/v1/documentation/methods','methods':[]},open(f'{OUT}/{obj}/v1.methods.json','w'),indent=2,ensure_ascii=False)
print(sorted(os.listdir(OUT)))
