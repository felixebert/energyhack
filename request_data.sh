#!/bin/sh
java -cp converter/target/converter-1.0-SNAPSHOT-jar-with-dependencies.jar de.ifcore.ehd.converter.Converter "viewer/web/data/data.json"
