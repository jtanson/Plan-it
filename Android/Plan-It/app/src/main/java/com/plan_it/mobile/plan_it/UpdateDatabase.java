package com.plan_it.mobile.plan_it;

import android.content.Context;
import android.content.Intent;
import android.util.Log;

import com.loopj.android.http.JsonHttpResponseHandler;
import com.loopj.android.http.RequestParams;

import org.json.JSONException;
import org.json.JSONObject;


/**
 * Created by Kevin on 06-Dec-2015.
 */
public class UpdateDatabase {

    public static void UpdateInvitation(IsAttending isAttending, int button, int eventID) throws JSONException {
        String answer = "";
        if (isAttending.equals("LEFT"))
        {
            answer = "Attending";
        }
        else if (isAttending.equals("DECLINED"))
        {
            answer = "Attending";
        }
        else if (isAttending.equals("INVITED") && button == 1)
        {
            answer = "Attending";
        }
        else if (isAttending.equals("ATTENDING") || isAttending.equals("INVITED") && button == 2)
        {
            answer = "Declined";
        }

        RestClient.put("events/" + eventID + "/invite/" + answer, null, LoginActivity.token, new JsonHttpResponseHandler() {
            public void onSuccess(String response) {
                JSONObject res;
                try {
                    res = new JSONObject(response);
                    Log.d("debug", res.getString("some_key")); // this is how you get a value out
                } catch (JSONException e) {
                    // TODO Auto-generated catch block
                    e.printStackTrace();
                }
            }
        });
    }

    public static void DeleteEvent(IsAttending isAttending, int eventID) {
        if(isAttending == IsAttending.OWNER) {
            RestClient.delete("events/" + eventID, null, LoginActivity.token, new JsonHttpResponseHandler() {
                public void onSuccess(String response) {
                    JSONObject res;
                    try {
                        res = new JSONObject(response);
                        Log.d("debug", res.getString("some_key")); // this is how you get a value out
                    } catch (JSONException e) {
                        // TODO Auto-generated catch block
                        e.printStackTrace();
                    }
                }
            });
        }

    }
}

