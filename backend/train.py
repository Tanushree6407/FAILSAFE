print("hi people")
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.metrics import roc_auc_score, classification_report
from xgboost import XGBClassifier
import joblib
url1 = 'https://raw.githubusercontent.com/Anti-mime/Summer-Projects/refs/heads/main/student-mat.csv'
url2 = 'https://raw.githubusercontent.com/Anti-mime/Summer-Projects/refs/heads/main/student-por.csv'

data1 = pd.read_csv(url1, sep = ';')
data2 = pd.read_csv(url2, sep = ';')
#Identifying the missing values in data1
data1.isnull().sum().sum()
#Identifying the missing values in data2
data2.isnull().sum().sum()
# print(data2[data2['G1']==0].shape[0])
# print(data2[data2['G2']==0].shape[0])
# print(data2[data2['G3']==0].shape[0])
# print(data1[(data1['G2']==0) & (data1['G3']==0) ].shape[0])
# print(data1[(data1['G1']==0) & (data1['G3']==0) ].shape[0])
# print(data1[(data2['G1']==0) & (data1['G2']==0) ].shape[0])
#feature engineering
data1["at_risk"] = (data1["G3"] < 10).astype(int)
data2["at_risk"] = (data2["G3"] < 10).astype(int)
data1['grade_drop'] = data1['G2'] - data1['G1']
data2['grade_drop'] = data2['G2'] - data2['G1']
data1 = data1.drop(columns=['G3'])
data2 = data2.drop(columns=['G3'])
y1 = data1['at_risk']
y2 = data2['at_risk']

# Early — no grades at all
X1_early = data1.drop(columns=['at_risk', 'G1', 'G2', 'grade_drop'])
X2_early = data2.drop(columns=['at_risk', 'G1', 'G2', 'grade_drop'])

# Mid1 — with G1 only
X1_mid1  = data1.drop(columns=['at_risk', 'G2', 'grade_drop'])
X2_mid1  = data2.drop(columns=['at_risk', 'G2', 'grade_drop'])

# Mid2 — with G1 and G2
X1_mid2  = data1.drop(columns=['at_risk'])
X2_mid2  = data2.drop(columns=['at_risk'])
# Get indices once for data1
train_idx1, test_idx1 = train_test_split(
    data1.index, test_size=0.2, random_state=1, stratify=y1
)

# Apply same indices to all 3 feature sets
X1_early_train, X1_early_test = X1_early.loc[train_idx1], X1_early.loc[test_idx1]
X1_mid1_train,  X1_mid1_test  = X1_mid1.loc[train_idx1],  X1_mid1.loc[test_idx1]
X1_mid2_train,  X1_mid2_test  = X1_mid2.loc[train_idx1],  X1_mid2.loc[test_idx1]
y1_train,       y1_test        = y1.loc[train_idx1],       y1.loc[test_idx1]

# Get indices once for data2
train_idx2, test_idx2 = train_test_split(
    data2.index, test_size=0.2, random_state=1, stratify=y2
)

# Apply same indices to all 3 feature sets
X2_early_train, X2_early_test = X2_early.loc[train_idx2], X2_early.loc[test_idx2]
X2_mid1_train,  X2_mid1_test  = X2_mid1.loc[train_idx2],  X2_mid1.loc[test_idx2]
X2_mid2_train,  X2_mid2_test  = X2_mid2.loc[train_idx2],  X2_mid2.loc[test_idx2]
y2_train,       y2_test        = y2.loc[train_idx2],       y2.loc[test_idx2]
from sklearn.preprocessing import OneHotEncoder
import pandas as pd
import joblib

cat_cols = ["school", "sex", "address", "famsize", "Pstatus", "Fjob", "Mjob",
            "guardian", "reason", "schoolsup", "famsup", "paid", "activities",
            "nursery", "higher", "internet", "romantic"]


# Fit encoder on most complete training set
encoder1 = OneHotEncoder(handle_unknown='ignore', sparse_output=False, drop='first')
encoder1.fit(X1_mid2_train[cat_cols])

encoder2 = OneHotEncoder(handle_unknown='ignore', sparse_output=False, drop='first')
encoder2.fit(X2_mid2_train[cat_cols])

# Transform function
def encode(df, encoder):
    encoded = encoder.transform(df[cat_cols])
    cols    = encoder.get_feature_names_out(cat_cols)
    return pd.concat([df.drop(columns=cat_cols),
                      pd.DataFrame(encoded, columns=cols, index=df.index)], axis=1)

# Encode all data1 splits
X1_early_train = encode(X1_early_train, encoder1)
X1_early_test  = encode(X1_early_test,  encoder1)
X1_mid1_train  = encode(X1_mid1_train,  encoder1)
X1_mid1_test   = encode(X1_mid1_test,   encoder1)
X1_mid2_train  = encode(X1_mid2_train,  encoder1)
X1_mid2_test   = encode(X1_mid2_test,   encoder1)

# Encode all data2 splits
X2_early_train = encode(X2_early_train, encoder2)
X2_early_test  = encode(X2_early_test,  encoder2)
X2_mid1_train  = encode(X2_mid1_train,  encoder2)
X2_mid1_test   = encode(X2_mid1_test,   encoder2)
X2_mid2_train  = encode(X2_mid2_train,  encoder2)
X2_mid2_test   = encode(X2_mid2_test,   encoder2)

# Save encoders
joblib.dump(encoder1, 'encoder1.pkl')
joblib.dump(encoder2, 'encoder2.pkl')
# Verify encoding worked
print(X1_early_test.dtypes.value_counts())
print(X1_early_test.shape)
# Math models
for stage_name, X_train, X_test in [
    ('early', X1_early_train, X1_early_test),
    ('mid1',  X1_mid1_train,  X1_mid1_test),
    ('mid2',  X1_mid2_train,  X1_mid2_test)
]:
    model = XGBClassifier(random_state=42, verbosity=0)
    model.fit(X_train, y1_train)
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    auc    = roc_auc_score(y1_test, y_prob)
    print(f"\nModel : {stage_name}")
    print(f"AUC   : {auc:.3f}")
    print(classification_report(y1_test, y_pred,
          target_names=['Safe', 'At Risk']))
    joblib.dump(model, f'model_math_{stage_name}.pkl')
    print(f"Saved : model_math_{stage_name}.pkl")
# Portuguese models
for stage_name, X_train, X_test in [
    ('early', X2_early_train, X2_early_test),
    ('mid1',  X2_mid1_train,  X2_mid1_test),
    ('mid2',  X2_mid2_train,  X2_mid2_test)
]:
    model = XGBClassifier(random_state=42, verbosity=0)
    model.fit(X_train, y2_train)
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    auc    = roc_auc_score(y2_test, y_prob)
    print(f"\nModel : {stage_name}")
    print(f"AUC   : {auc:.3f}")
    print(classification_report(y2_test, y_pred,
          target_names=['Safe', 'At Risk']))
    joblib.dump(model, f'model_port_{stage_name}.pkl')
    print(f"Saved : model_port_{stage_name}.pkl")
ratio1 = (y1_train == 0).sum() / (y1_train == 1).sum()
ratio2 = (y2_train == 0).sum() / (y2_train == 1).sum()

tuned_params = dict(
    random_state     = 42,
    # scale_pos_weight = 2,
    max_depth        = 4,
    learning_rate    = 0.1,
    n_estimators     = 200,
    verbosity        = 0
)
# Math models
for stage_name, X_train, X_test in [
    ('early', X1_early_train, X1_early_test),
    ('mid1',  X1_mid1_train,  X1_mid1_test),
    ('mid2',  X1_mid2_train,  X1_mid2_test)
]:
    model = XGBClassifier(**tuned_params, scale_pos_weight=ratio1)
    model.fit(X_train, y1_train)
    auc = roc_auc_score(y1_test, model.predict_proba(X_test)[:,1])
    print(f"Math {stage_name} AUC: {auc:.3f}")
    joblib.dump(model, f'model_math_{stage_name}_tuned.pkl')
    print(f"Saved: model_math_{stage_name}_tuned.pkl")
# Portuguese models
for stage_name, X_train, X_test in [
    ('early', X2_early_train, X2_early_test),
    ('mid1',  X2_mid1_train,  X2_mid1_test),
    ('mid2',  X2_mid2_train,  X2_mid2_test)
]:
    model = XGBClassifier(**tuned_params, scale_pos_weight=ratio2)
    model.fit(X_train, y2_train)
    auc = roc_auc_score(y2_test, model.predict_proba(X_test)[:,1])
    print(f"Portuguese {stage_name} AUC: {auc:.3f}")
    joblib.dump(model, f'model_port_{stage_name}_tuned.pkl')
    print(f"Saved: model_port_{stage_name}_tuned.pkl")

def get_interventions(shap_vals, feature_names, student_data):

    # Handle 2D shap output
    if hasattr(shap_vals, 'ndim') and shap_vals.ndim == 2:
        shap_vals = shap_vals[1]

    shap_df = pd.DataFrame({
        'feature' : feature_names,
        'shap'    : shap_vals,
        'value'   : student_data.values
    }).sort_values('shap', ascending=False)

    interventions = []

    for _, row in shap_df.iterrows():
        f = row['feature']
        s = row['shap']
        v = row['value']

        if s <= 0:
            break

        if 'absences' in f and s > 0.3 and v > 5:
            interventions.append('🔴 Attendance counselling — missing classes frequently')
        elif 'failures' in f and s > 0.3 and v > 0:
            interventions.append('🔴 Enroll in remedial tutoring immediately')
        elif 'grade_drop' in f and s > 0.3 and v < -2:
            interventions.append('🔴 Urgent — significant grade decline, schedule faculty meeting')
        elif 'G1' in f and s > 0.3 and v < 8:
            interventions.append('🔴 Very low first period grade — extra classes recommended')
        elif 'goout' in f and s > 0.2 and v >= 4:
            interventions.append('🟡 Lifestyle counselling — social activity affecting studies')
        elif 'studytime' in f and s > 0.2 and v <= 2:
            interventions.append('🟡 Assign study skills workshop')
        elif 'Walc' in f and s > 0.2 and v >= 3:
            interventions.append('🟡 Alcohol awareness counselling recommended')
        elif 'Dalc' in f and s > 0.2 and v >= 3:
            interventions.append('🟡 Alcohol awareness counselling recommended')
        elif 'schoolsup' in f and s > 0.2 and v == 1:
            interventions.append('🟡 Review existing school support plan')
        elif 'health' in f and s > 0.2 and v <= 2:
            interventions.append('🟢 Refer to health support services')
        elif 'famrel' in f and s > 0.2 and v <= 2:
            interventions.append('🟢 Family relations counselling recommended')
        elif 'famsup' in f and s > 0.2 and v == 0:
            interventions.append('🟢 Connect family with academic resources')
        elif 'freetime' in f and s > 0.2 and v >= 4:
            interventions.append('🟢 Help student structure free time productively')
        elif 'higher' in f and s > 0.2 and v == 0:
            interventions.append('🟢 Career guidance session recommended')
        elif 'internet' in f and s > 0.2 and v == 0:
            interventions.append('🟢 Arrange library/school resource access')

    return interventions if interventions else ['✅ No immediate intervention required']



import shap
import joblib
import matplotlib.pyplot as plt

models_to_explain = [
    ('model_math_early_tuned',  X1_early_test, y1_test, 'Math Early'),
    ('model_math_mid1_tuned',   X1_mid1_test,  y1_test, 'Math Mid1'),
    ('model_math_mid2_tuned',   X1_mid2_test,  y1_test, 'Math Mid2'),
    ('model_port_early_tuned',  X2_early_test, y2_test, 'Portuguese Early'),
    ('model_port_mid1_tuned',   X2_mid1_test,  y2_test, 'Portuguese Mid1'),
    ('model_port_mid2_tuned',   X2_mid2_test,  y2_test, 'Portuguese Mid2'),
]

for model_name, X_test, y_test_loop, label in models_to_explain:

    print(f'\n{"="*50}')
    print(f'SHAP for: {label}')
    print(f'{"="*50}')

    # Step 1 - load correct model
    model     = joblib.load(f'{model_name}.pkl')

    # Step 2 - create explainer for THIS model
    explainer = shap.TreeExplainer(model)

    # Step 3 - calculate shap values on MATCHING test set
    shap_vals = explainer.shap_values(X_test)

    # Step 4 - global importance (uses same X_test) ✅
    shap.summary_plot(shap_vals, X_test,
                      plot_type='bar', max_display=15,
                      show=False)
    plt.title(f'{label} — Feature Importance')
    plt.tight_layout()
    plt.show()

    # Step 5 - beeswarm (uses same X_test) ✅
    shap.summary_plot(shap_vals, X_test,
                      max_display=15,
                      show=False)
    plt.title(f'{label} — Beeswarm')
    plt.tight_layout()
    plt.show()

    at_risk_idx = (y_test_loop == 1).values.argmax()

    # Step 6 - waterfall for first at-risk student ✅
    shap.waterfall_plot(
        shap.Explanation(
            values        = shap_vals[at_risk_idx],
            base_values   = explainer.expected_value,
            data          = X_test.iloc[at_risk_idx],
            feature_names = X_test.columns.tolist()
        )
    )

    # Intervention for first at-risk student


    interventions = get_interventions(
        shap_vals[at_risk_idx],
        X_test.columns.tolist(),
        X_test.iloc[at_risk_idx]
    )

    print(f"\nInterventions for first at-risk student ({label}):")
    for action in interventions:
        print(f"  {action}")

    # Step 7 - save explainer
    joblib.dump(explainer, f'shap_{model_name}.pkl')
    print(f'Saved: shap_{model_name}.pkl ✅')